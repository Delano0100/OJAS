import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { getMe, loginUser, registerUser } from '../services/auth.service'

const STORAGE_TOKEN_KEY = 'token'

const getInitialToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem(STORAGE_TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getInitialToken)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const me = await getMe(token)
        setUser(me)
      } catch (error) {
        console.error('Failed to load current user:', error)
        localStorage.removeItem(STORAGE_TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token])

  const login = async (payload) => {
    const response = await loginUser(payload)
    localStorage.setItem(STORAGE_TOKEN_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
    return response
  }

  const register = async (payload) => {
    const response = await registerUser(payload)
    localStorage.setItem(STORAGE_TOKEN_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
    return response
  }

  const loginWithToken = async (incomingToken) => {
    const me = await getMe(incomingToken)
    localStorage.setItem(STORAGE_TOKEN_KEY, incomingToken)
    setToken(incomingToken)
    setUser(me)
    return me
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      loginWithToken,
      logout,
    }),
    [token, user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
