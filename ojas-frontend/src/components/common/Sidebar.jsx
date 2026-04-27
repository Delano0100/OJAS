import { Bell, Cpu, Home, Zap, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (path) => location.pathname === path

  const links = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/devices', label: 'Devices', icon: Cpu },
    { path: '/alerts', label: 'Alerts', icon: Bell },
    { path: '/energy', label: 'Energy', icon: Zap },
  ]

  const visibleLinks = user?.role === 'USER'
    ? links.filter((link) => link.path === '/devices')
    : links

  const canManageUsers = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(user?.role)
  const canAddDevice = ['SUPER_ADMIN', 'SUB_ADMIN', 'USER'].includes(user?.role)

  return (
    <div className="w-64 border-r border-border bg-surface/30 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-border px-6 py-6">
          <div className="font-mono text-2xl font-bold text-primary">OJAS</div>
          <div className="text-xs text-textSecondary mt-1">Omkar Energy Solutions</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-4 py-6">
          {visibleLinks.map((link) => {
            const IconComponent = link.icon

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                  isActive(link.path)
                    ? 'border-l-2 border-primary bg-primary/10 text-primary'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-border/20'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            )
          })}

          {(canManageUsers || canAddDevice) && (
            <div className="mt-6 space-y-2">
              <p className="px-4 text-xs font-semibold uppercase text-textSecondary">Quick Actions</p>
              {canManageUsers && (
                <Link
                  to="/settings"
                  className="group flex items-center gap-3 rounded-lg px-4 py-3 text-textSecondary hover:text-textPrimary hover:bg-border/20 transition-all"
                >
                  <span className="text-sm font-medium">Add User</span>
                </Link>
              )}
              {canAddDevice && (
                <Link
                  to="/devices"
                  className="group flex items-center gap-3 rounded-lg px-4 py-3 text-textSecondary hover:text-textPrimary hover:bg-border/20 transition-all"
                >
                  <span className="text-sm font-medium">Add Device</span>
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Settings */}
        <div className="border-t border-border px-4 py-6">
          <Link to="/settings" className="group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-textSecondary hover:text-textPrimary hover:bg-border/20 transition-all">
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
