import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { continueWithGoogle } from '../services/auth.service'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated, loading, loginWithToken } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const oauthToken = searchParams.get('token')
    const needsRoleSelection = searchParams.get('needsRoleSelection') === 'true'

    if (!oauthToken) {
      return
    }

    const completeGoogleLogin = async () => {
      try {
        const userData = await loginWithToken(oauthToken)
        
        // If role selection is needed, redirect to role selection page
        if (!userData.isRoleSelected) {
          navigate('/select-role')
        } else {
          navigate('/dashboard')
        }
      } catch (oauthError) {
        setError(oauthError.message)
      }
    }

    completeGoogleLogin()
  }, [searchParams, loginWithToken, navigate])

  // Only check isAuthenticated if we're not processing OAuth callback
  const isProcessingOAuth = searchParams.has('token')
  if (!loading && isAuthenticated && !isProcessingOAuth) {
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
      const response = await login(form)
      if (!response.user?.isRoleSelected) {
        navigate('/select-role')
      } else {
        navigate('/dashboard')
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-textPrimary flex items-center justify-center px-4">
      <div className="w-full max-w-md section-card">
        <h1 className="text-2xl font-semibold mb-2">Login</h1>
        <p className="text-sm text-textSecondary mb-6">Sign in to access OJAS</p>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <form onSubmit={onSubmit} className="space-y-4">
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
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary text-white py-2 font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={continueWithGoogle}
            className="w-full rounded-lg border border-border bg-bg py-2 font-medium text-textPrimary hover:bg-border/20"
          >
            Continue with Google
          </button>
        </form>

        <p className="mt-4 text-sm text-textSecondary">
          New here? <Link to="/register" className="text-primary">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
