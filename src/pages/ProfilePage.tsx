import { FormEvent, useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiChangePassword } from '../api'

export function ProfilePage() {
  const { appUser, token } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    if (!token) {
      setError('You must be signed in to change password.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password should be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }
    setLoading(true)
    try {
      await apiChangePassword(token, currentPassword, newPassword)
      setMessage('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      if (String(err.message || '').includes('incorrect')) {
        setError('Current password is incorrect.')
      } else {
        setError('Failed to update password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="text-muted">
            Keep your details up to date and change your password any time.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="glass-card">
          <h2>Account</h2>
          <div className="profile-field">
            <span className="field-label-inline">Name</span>
            <span>{appUser?.name}</span>
          </div>
          <div className="profile-field">
            <span className="field-label-inline">Email</span>
            <span>{appUser?.email}</span>
          </div>
          <div className="profile-field">
            <span className="field-label-inline">Role</span>
            <span>{appUser?.role === 'manager' ? 'Manager' : 'Employee'}</span>
          </div>
        </section>

        <section className="glass-card">
          <h2>Change password</h2>
          <form className="form" onSubmit={handlePasswordChange}>
            <label className="field">
              <span className="field-label">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>

            {error && <p className="error-text">{error}</p>}
            {message && <p className="success-text">{message}</p>}

            <button className="btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  )
}

