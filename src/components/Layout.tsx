import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout({ children }: { children: ReactNode }) {
  const { appUser, signOutUser } = useAuth()
  const location = useLocation()

  const isManager = appUser?.role === 'manager'

  const handleSignOut = async () => {
    await signOutUser()
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="avatar-circle">
            {appUser?.name?.[0]?.toUpperCase() || 'T'}
          </div>
          <div>
            <div className="user-name">{appUser?.name || 'Team Member'}</div>
            <div className="user-role">
              {isManager ? 'Manager' : 'Employee'}
            </div>
          </div>
        </div>
        <nav className="nav">
          <Link
            to={isManager ? '/manager' : '/employee'}
            className={
              location.pathname.includes('manager') ||
              location.pathname.includes('employee')
                ? 'nav-link active'
                : 'nav-link'
            }
          >
            Dashboard
          </Link>
          <Link
            to="/profile"
            className={
              location.pathname === '/profile' ? 'nav-link active' : 'nav-link'
            }
          >
            Profile
          </Link>
        </nav>
        <button className="btn-secondary signout-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}

