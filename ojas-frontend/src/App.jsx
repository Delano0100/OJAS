import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Navbar from './components/common/Navbar'
import Sidebar from './components/common/Sidebar'
import { useAuth } from './hooks/useAuth'
import { useEffect } from 'react'
import Alerts from './pages/Alerts'
import Dashboard from './pages/Dashboard'
import DCBDetail from './pages/DCBDetail'
import DeviceDetail from './pages/DeviceDetail'
import Devices from './pages/Devices'
import Energy from './pages/Energy'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import SelectRole from './pages/SelectRole'
import Settings from './pages/Settings'
import RoleGuard from './components/common/RoleGuard'

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-bg text-textPrimary">
      <div className="mx-auto flex w-full max-w-[1700px]">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/devices/:id" element={<DeviceDetail />} />
              <Route path="/dcb/:id" element={<DCBDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/energy" element={<Energy />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const { isAuthenticated, loading, loginWithToken } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      return
    }

    const needsRoleSelection = params.get('needsRoleSelection') === 'true'
    params.delete('token')
    params.delete('needsRoleSelection')
    const query = params.toString()
    const pathname = (window.location.pathname || '/').replace(/\/+/g, '/')
    const nextUrl = `${pathname}${query ? `?${query}` : ''}`
    window.history.replaceState({}, '', nextUrl)

    localStorage.setItem('token', token)
    loginWithToken(token)
      .then((userData) => {
        const shouldSelectRole = needsRoleSelection || !userData?.isRoleSelected
        navigate(shouldSelectRole ? '/select-role' : '/dashboard', { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/login', { replace: true })
      })
  }, [loginWithToken, navigate])

  if (loading) {
    return <div className="min-h-screen bg-bg" />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="/select-role"
        element={isAuthenticated ? <SelectRole /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/settings"
        element={
          <RoleGuard allowedRoles={['USER,'SUPER_ADMIN', 'SUB_ADMIN']}>
            <Settings />
          </RoleGuard>
        }
      />
      <Route
        path="/*"
        element={isAuthenticated ? <ProtectedLayout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App
