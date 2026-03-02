import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/Layout'
import type { LeaveRequest } from '../types'
import {
  apiCreateLeave,
  apiGetLeaves,
  connectLeavesEvents,
} from '../api'

export function EmployeeDashboard() {
  const { appUser, token } = useAuth()
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([])
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([])
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    type: 'Casual',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !appUser) return
    let unsubscribeSse: (() => void) | undefined
    ;(async () => {
      try {
        const leaves = await apiGetLeaves(token)
        setMyLeaves(leaves.filter((l) => l.employeeId === appUser.uid))
        setTeamLeaves(leaves)
      } catch (err) {
        console.error('Failed to load leaves', err)
      }
      unsubscribeSse = connectLeavesEvents(token, (leaves) => {
        setMyLeaves(leaves.filter((l) => l.employeeId === appUser.uid))
        setTeamLeaves(leaves)
      })
    })()
    return () => {
      if (unsubscribeSse) unsubscribeSse()
    }
  }, [token, appUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appUser || !token) return
    setSubmitting(true)
    try {
      await apiCreateLeave(token, {
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        type: form.type as any,
        reason: form.reason,
      })
      setForm({
        startDate: '',
        endDate: '',
        type: 'Casual',
        reason: '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>My leave dashboard</h1>
          <p className="text-muted">
            Apply for leave and see your colleagues&apos; schedule in real
            time.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="glass-card">
          <h2>Apply for leave</h2>
          <form className="form" onSubmit={handleSubmit}>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Start date</span>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span className="field-label">End date</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
                <span className="field-help">
                  Leave blank for a single-day leave.
                </span>
              </label>
            </div>

            <label className="field">
              <span className="field-label">Type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                <option>Casual</option>
                <option>Sick</option>
                <option>Earned</option>
                <option>Other</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Reason</span>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="Add a short note for your manager"
              />
            </label>

            <button className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit leave request'}
            </button>
          </form>
        </section>

        <section className="glass-card">
          <h2>My requests</h2>
          <div className="list">
            {myLeaves.length === 0 && (
              <p className="text-muted">You haven&apos;t requested leave yet.</p>
            )}
            {myLeaves.map((leave) => (
              <article key={leave.id} className="leave-card">
                <div className="leave-main">
                  <h3>
                    {format(new Date(leave.startDate), 'dd MMM yyyy')}
                    {leave.endDate &&
                      leave.endDate !== leave.startDate &&
                      ` – ${format(new Date(leave.endDate), 'dd MMM yyyy')}`}
                  </h3>
                  <span className={`status-pill status-${leave.status}`}>
                    {leave.status}
                  </span>
                </div>
                <p className="text-muted">{leave.type} leave</p>
                {leave.reason && <p className="leave-reason">{leave.reason}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-card">
        <h2>Team calendar (read-only)</h2>
        <p className="text-muted">
          See who else is on leave to avoid bottlenecks.
        </p>
        <div className="list horizontal-scroll">
          {teamLeaves.length === 0 && (
            <p className="text-muted">No team leave scheduled yet.</p>
          )}
          {teamLeaves.map((leave) => (
            <article key={leave.id} className="leave-chip">
              <div className="leave-chip-header">
                <span className="chip-name">{leave.employeeName}</span>
                <span className={`status-dot status-${leave.status}`} />
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
    </Layout>
  )
}

