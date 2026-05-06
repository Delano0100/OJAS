import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const navigate = useNavigate()
  const { register, isAuthenticated, loading } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await register(form)
       navigate('/select-role')
      // if (!response.user?.isRoleSelected) {
      //   navigate('/select-role')
      // } else {
      //   navigate('/dashboard')
      // }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-textPrimary flex items-center justify-center px-4">
      <div className="w-full max-w-md section-card">
        <h1 className="text-2xl font-semibold mb-2">Create Account</h1>
        <p className="text-sm text-textSecondary mb-6">Register to start managing devices</p>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full rounded-lg border border-border bg-bg px-4 py-2"
            type="text"
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={onChange}
            required
          />
          <input
            className="w-full rounded-lg border border-border bg-bg px-4 py-2"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange}
            required
          />
          <input
            className="w-full rounded-lg border border-border bg-bg px-4 py-2"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={onChange}
            minLength={6}
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary text-white py-2 font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-textSecondary">
          Already have an account? <Link to="/login" className="text-primary">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
