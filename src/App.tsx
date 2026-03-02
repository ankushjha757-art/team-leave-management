import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { EmployeeDashboard } from './pages/EmployeeDashboard'
import { ManagerDashboard } from './pages/ManagerDashboard'
import { ProfilePage } from './pages/ProfilePage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="glass-card">
          <p className="text-muted">Checking your session…</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/employee"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
