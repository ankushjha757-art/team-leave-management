import type { AppUser, LeaveRequest } from './types'

const API_BASE = 'https://team-leave-management.onrender.com/api'

export interface LoginResult {
  token: string
  user: AppUser
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json()
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResult> {
  return request<LoginResult>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiMe(token: string): Promise<AppUser> {
  return request<AppUser>('/me', { method: 'GET' }, token)
}

export async function apiGetLeaves(token: string): Promise<LeaveRequest[]> {
  return request<LeaveRequest[]>('/leaves', { method: 'GET' }, token)
}

export async function apiCreateLeave(
  token: string,
  data: Pick<LeaveRequest, 'startDate' | 'endDate' | 'type' | 'reason'>,
): Promise<LeaveRequest> {
  return request<LeaveRequest>(
    '/leaves',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  )
}

export async function apiUpdateLeaveStatus(
  token: string,
  id: string,
  status: 'approved' | 'rejected',
): Promise<LeaveRequest> {
  return request<LeaveRequest>(
    `/leaves/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token,
  )
}

export async function apiChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await request('/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  }, token)
}

export function connectLeavesEvents(
  token: string,
  onLeavesUpdated: (leaves: LeaveRequest[]) => void,
): () => void {
  const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`
  const es = new EventSource(url)
  es.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      if (payload.type === 'leaves-updated') {
        onLeavesUpdated(payload.leaves as LeaveRequest[])
      }
    } catch (err) {
      console.error('Failed to parse SSE message', err)
    }
  }
  es.onerror = (err) => {
    console.error('SSE error', err)
  }
  return () => es.close()
}

