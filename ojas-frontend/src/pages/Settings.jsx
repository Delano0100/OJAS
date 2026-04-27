import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { cleanupTelemetryHistory } from '../services/device.service'
import { createManagedUser, createSubAdminUser, getAdminUsers } from '../services/auth.service'

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' })
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminError, setAdminError] = useState(null)
  const [adminMessage, setAdminMessage] = useState(null)
  const [users, setUsers] = useState([])
  const [retentionDays, setRetentionDays] = useState(30)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState(null)
  const [cleanupError, setCleanupError] = useState(null)
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return savedTheme ? savedTheme === 'dark' : prefersDark
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const onCleanup = async () => {
    setCleanupLoading(true)
    setCleanupError(null)
    setCleanupResult(null)

    try {
      const data = await cleanupTelemetryHistory(retentionDays)
      setCleanupResult(data)
    } catch (error) {
      setCleanupError(error.message)
    } finally {
      setCleanupLoading(false)
    }
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isSubAdmin = user?.role === 'SUB_ADMIN'

  useEffect(() => {
    const loadUsers = async () => {
      if (!user?.role) {
        return
      }

      try {
        const data = await getAdminUsers()
        setUsers(data)
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }

    loadUsers()
  }, [user?.role])

  const onAdminChange = (event) => {
    const { name, value } = event.target
    setAdminForm((prev) => ({ ...prev, [name]: value }))
  }

  const onCreateAdminUser = async () => {
    setAdminSubmitting(true)
    setAdminError(null)
    setAdminMessage(null)

    try {
      const payload = {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
      }

      if (isSuperAdmin) {
        await createSubAdminUser(payload)
        setAdminMessage('Sub-admin created successfully')
      } else if (isSubAdmin) {
        await createManagedUser(payload)
        setAdminMessage('User created successfully')
      }

      setAdminForm({ name: '', email: '', password: '' })
      const data = await getAdminUsers()
      setUsers(data)
    } catch (error) {
      setAdminError(error.message)
    } finally {
      setAdminSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary mb-1">Settings</h1>
        <p className="text-textSecondary">Account and interface preferences</p>
      </div>

      <div className="section-card space-y-3">
        <h2 className="text-lg font-semibold text-textPrimary">User Profile</h2>
        <p className="text-sm text-textSecondary">Name: <span className="text-textPrimary">{user?.name || '--'}</span></p>
        <p className="text-sm text-textSecondary">Email: <span className="text-textPrimary">{user?.email || '--'}</span></p>
        <p className="text-sm text-textSecondary">Role: <span className="text-textPrimary">{user?.role || '--'}</span></p>
        <p className="text-sm text-textSecondary">User ID: <span className="text-textPrimary">{user?.id || '--'}</span></p>
        <p className="text-sm text-textSecondary">Created By: <span className="text-textPrimary">{user?.createdBy?.email || '--'}</span></p>
      </div>

      {(isSuperAdmin || isSubAdmin) && (
        <div className="section-card space-y-4">
          <h2 className="text-lg font-semibold text-textPrimary">{isSuperAdmin ? 'Create Sub Admin' : 'Create User'}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              name="name"
              placeholder="Name"
              value={adminForm.name}
              onChange={onAdminChange}
            />
            <input
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              name="email"
              placeholder="Email"
              value={adminForm.email}
              onChange={onAdminChange}
            />
            <input
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              name="password"
              type="password"
              placeholder="Password"
              value={adminForm.password}
              onChange={onAdminChange}
            />
          </div>
          <button
            onClick={onCreateAdminUser}
            disabled={adminSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {adminSubmitting ? 'Submitting...' : isSuperAdmin ? 'Create Sub Admin' : 'Create User'}
          </button>
          {adminError && <p className="text-sm text-danger">{adminError}</p>}
          {adminMessage && <p className="text-sm text-success">{adminMessage}</p>}
        </div>
      )}

      <div className="section-card space-y-3">
        <h2 className="text-lg font-semibold text-textPrimary">User Access List</h2>
        {users.length === 0 ? (
          <p className="text-sm text-textSecondary">No users available in your scope.</p>
        ) : (
          users.map((entry) => (
            <div key={entry._id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <p className="text-sm text-textPrimary">{entry.name}</p>
                <p className="text-xs text-textSecondary">{entry.email}</p>
              </div>
              <span className="text-xs rounded-full px-2 py-1 bg-border/30 text-textPrimary">{entry.role}</span>
            </div>
          ))
        )}
      </div>

      <div className="section-card flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-textPrimary">Theme</h2>
          <p className="text-sm text-textSecondary">Switch between light and dark modes</p>
        </div>
        <button
          onClick={() => setIsDark((prev) => !prev)}
          className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-textPrimary hover:bg-border/20"
        >
          {isDark ? (
            <span className="inline-flex items-center gap-2"><Sun className="h-4 w-4" /> Light Mode</span>
          ) : (
            <span className="inline-flex items-center gap-2"><Moon className="h-4 w-4" /> Dark Mode</span>
          )}
        </button>
      </div>

      <div className="section-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-textPrimary">Telemetry Retention</h2>
          <p className="text-sm text-textSecondary">Delete telemetry older than selected days for your devices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-textSecondary" htmlFor="retention-days">Retention (days)</label>
          <input
            id="retention-days"
            type="number"
            min="1"
            value={retentionDays}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
            className="w-28 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-textPrimary"
          />
          <button
            onClick={onCleanup}
            disabled={cleanupLoading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {cleanupLoading ? 'Cleaning...' : 'Run Cleanup'}
          </button>
        </div>

        {cleanupError && <p className="text-sm text-danger">{cleanupError}</p>}
        {cleanupResult && (
          <p className="text-sm text-success">
            Deleted {cleanupResult.deletedCount} records older than {cleanupResult.days} days.
          </p>
        )}
      </div>

      <div className="section-card">
        <button
          onClick={onLogout}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
