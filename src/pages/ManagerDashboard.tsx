import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Layout } from '../components/Layout'
import type { LeaveRequest } from '../types'
import {
  apiGetLeaves,
  apiUpdateLeaveStatus,
  connectLeavesEvents,
} from '../api'
import { useAuth } from '../context/AuthContext'

interface ConflictModalState {
  target: LeaveRequest | null
  conflicts: LeaveRequest[]
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = new Date(aStart).getTime()
  const aE = new Date(aEnd).getTime()
  const bS = new Date(bStart).getTime()
  const bE = new Date(bEnd).getTime()
  return aS <= bE && aE >= bS
}

export function ManagerDashboard() {
  const { token } = useAuth()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [modal, setModal] = useState<ConflictModalState>({
    target: null,
    conflicts: [],
  })

  useEffect(() => {
    if (!token) return
    let unsubscribeSse: (() => void) | undefined
    ;(async () => {
      try {
        const leaves = await apiGetLeaves(token)
        setLeaves(leaves)
      } catch (err) {
        console.error('Failed to load leaves', err)
      }
      unsubscribeSse = connectLeavesEvents(token, (leaves) => {
        setLeaves(leaves)
      })
    })()
    return () => {
      if (unsubscribeSse) unsubscribeSse()
    }
  }, [token])

  const pending = useMemo(
    () => leaves.filter((l) => l.status === 'pending'),
    [leaves],
  )
  const approved = useMemo(
    () => leaves.filter((l) => l.status === 'approved'),
    [leaves],
  )

  const openApproveWithConflicts = (leave: LeaveRequest) => {
    const conflicts = leaves.filter(
      (other) =>
        other.id !== leave.id &&
        (other.status === 'approved' || other.status === 'pending') &&
        datesOverlap(leave.startDate, leave.endDate, other.startDate, other.endDate),
    )
    if (conflicts.length >= 1) {
      setModal({ target: leave, conflicts })
    } else {
      handleStatusChange(leave, 'approved')
    }
  }

  const handleStatusChange = async (
    leave: LeaveRequest,
    status: 'approved' | 'rejected',
  ) => {
    if (!token) return
    setProcessingId(leave.id)
    try {
      await apiUpdateLeaveStatus(token, leave.id, status)
      setModal({ target: null, conflicts: [] })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Manager dashboard</h1>
          <p className="text-muted">
            Review, approve, or reject leave requests in real time. Get alerted
            when multiple employees overlap.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="glass-card">
          <h2>Pending approvals</h2>
          <div className="list">
            {pending.length === 0 && (
              <p className="text-muted">
                No pending leave requests at the moment.
              </p>
            )}
            {pending.map((leave) => (
              <article key={leave.id} className="leave-card">
                <div className="leave-main">
                  <div>
                    <h3>{leave.employeeName}</h3>
                    <p className="text-muted">
                      {format(new Date(leave.startDate), 'dd MMM yyyy')}
                      {leave.endDate &&
                        leave.endDate !== leave.startDate &&
                        ` – ${format(
                          new Date(leave.endDate),
                          'dd MMM yyyy',
                        )}`}
                    </p>
                  </div>
                  <span className="badge-pill">{leave.type}</span>
                </div>
                {leave.reason && (
                  <p className="leave-reason manager-reason">{leave.reason}</p>
                )}
                <div className="btn-row">
                  <button
                    className="btn-outline"
                    disabled={processingId === leave.id}
                    onClick={() => handleStatusChange(leave, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="btn-primary"
                    disabled={processingId === leave.id}
                    onClick={() => openApproveWithConflicts(leave)}
                  >
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card">
          <h2>Approved calendar</h2>
          <p className="text-muted">
            All approved leave across the 15 employees.
          </p>
          <div className="list horizontal-scroll">
            {approved.length === 0 && (
              <p className="text-muted">No approved leave yet.</p>
            )}
            {approved.map((leave) => (
              <article key={leave.id} className="leave-chip">
                <div className="leave-chip-header">
                  <span className="chip-name">{leave.employeeName}</span>
                  <span className="status-dot status-approved" />
                </div>
                <div className="leave-chip-body">
                  <span>
                    {format(new Date(leave.startDate), 'dd MMM')}
                    {leave.endDate &&
                      leave.endDate !== leave.startDate &&
                      `–${format(new Date(leave.endDate), 'dd MMM')}`}
                  </span>
                  <span className="chip-type">{leave.type}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {modal.target && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Potential bottleneck detected</h2>
            <p className="text-muted">
              {modal.conflicts.length === 1
                ? 'Another team member has leave overlapping with this request.'
                : 'Multiple team members have leave overlapping with this request.'}
            </p>
            <div className="modal-list">
              {modal.conflicts.map((c) => (
                <div key={c.id} className="modal-conflict-row">
                  <span className="chip-name">{c.employeeName}</span>
                  <span>
                    {format(new Date(c.startDate), 'dd MMM')}
                    {c.endDate &&
                      c.endDate !== c.startDate &&
                      `–${format(new Date(c.endDate), 'dd MMM')}`}
                  </span>
                  <span className="chip-type">{c.type}</span>
                </div>
              ))}
            </div>
            <div className="btn-row">
              <button
                className="btn-outline"
                onClick={() => setModal({ target: null, conflicts: [] })}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  modal.target &&
                  handleStatusChange(modal.target, 'approved')
                }
              >
                Approve anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

