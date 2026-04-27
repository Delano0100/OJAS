import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { setRole as setRoleApi } from '../services/auth.service'

export default function SelectRole() {
  const navigate = useNavigate()
  const { user, loginWithToken } = useAuth()
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // If user already has a role or is not authenticated, redirect
  if (user && user.role) {
    navigate('/')
    return null
  }

  const handleRoleSelect = async (role) => {
    setSelectedRole(role)
    setLoading(true)
    setError(null)

    try {
      const response = await setRoleApi(role)
      // Update auth context with new token
      await loginWithToken(response.token)
      // User role is updated, redirect to dashboard
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to set role. Please try again.')
      setSelectedRole(null)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-textPrimary flex items-center justify-center px-4">
      <div className="w-full max-w-md section-card">
        <h1 className="text-2xl font-semibold mb-2">Select Your Role</h1>
        <p className="text-sm text-textSecondary mb-8">
          Choose how you want to use OJAS
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/30">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Sub Admin Card */}
          <button
            onClick={() => handleRoleSelect('SUB_ADMIN')}
            disabled={loading}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              selectedRole === 'SUB_ADMIN'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-bg hover:border-primary/50'
            } disabled:opacity-60 text-left`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-textPrimary mb-1">
                  {loading && selectedRole === 'SUB_ADMIN' ? 'Setting Role...' : 'Sub Admin'}
                </h3>
                <p className="text-sm text-textSecondary">
                  Manage users and their devices
                </p>
              </div>
              {selectedRole === 'SUB_ADMIN' && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  loading ? 'bg-gray-400' : 'bg-primary'
                }`}>
                  {loading ? (
                    <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* User Card */}
          <button
            onClick={() => handleRoleSelect('USER')}
            disabled={loading}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              selectedRole === 'USER'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-bg hover:border-primary/50'
            } disabled:opacity-60 text-left`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-textPrimary mb-1">
                  {loading && selectedRole === 'USER' ? 'Setting Role...' : 'User'}
                </h3>
                <p className="text-sm text-textSecondary">
                  View and manage your own devices
                </p>
              </div>
              {selectedRole === 'USER' && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  loading ? 'bg-gray-400' : 'bg-primary'
                }`}>
                  {loading ? (
                    <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>

        <p className="text-xs text-textSecondary text-center mt-6">
          Click on your preferred role to continue
        </p>
      </div>
    </div>
  )
}
