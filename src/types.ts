export type UserRole = 'employee' | 'manager'

export interface AppUser {
  uid: string
  name: string
  email: string
  role: UserRole
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  type: 'Casual' | 'Sick' | 'Earned' | 'Other'
  reason: string
  status: LeaveStatus
  createdAt: string
  updatedAt: string
  managerComment?: string
}

