import { Bell, Settings, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return savedTheme ? savedTheme === 'dark' : prefersDark
  })

  function applyTheme(dark) {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Keep root class in sync with current theme state.
  useEffect(() => {
    applyTheme(isDark)
  }, [isDark])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    console.log(`🌓 Theme toggled to ${newTheme ? 'dark' : 'light'} mode`)
  }

  return (
    <nav className="border-b border-border bg-surface/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-sm font-medium text-textSecondary">Dashboard Overview</h1>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/alerts"
            className="relative rounded-lg p-2 hover:bg-border/50 transition-colors"
          >
            <Bell className="h-5 w-5 text-textSecondary hover:text-textPrimary" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger"></span>
          </Link>

          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg p-2 hover:bg-border/50 transition-colors"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-textSecondary hover:text-textPrimary" />
            ) : (
              <Moon className="h-5 w-5 text-textSecondary hover:text-textPrimary" />
            )}
          </button>

          <Link to="/settings" className="rounded-lg p-2 hover:bg-border/50 transition-colors">
            <Settings className="h-5 w-5 text-textSecondary hover:text-textPrimary" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
