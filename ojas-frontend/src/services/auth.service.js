const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is required')
}

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api\/?$/, '')

const parseResponse = async (response) => {
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const message = json?.error?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return json?.data
}

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  return parseResponse(response)
}

export const registerUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  })

  return parseResponse(response)
}

export const getMe = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return parseResponse(response)
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const continueWithGoogle = () => {
  window.location.href = `${BACKEND_BASE_URL}/auth/google`
}

export const createSubAdminUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_BASE_URL}/admin/create-subadmin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password }),
  })

  return parseResponse(response)
}

export const createManagedUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_BASE_URL}/admin/create-user`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password }),
  })

  return parseResponse(response)
}

export const getAdminUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getAuthHeaders(),
  })

  return parseResponse(response)
}

export const setRole = async (role) => {
  const response = await fetch(`${API_BASE_URL}/auth/set-role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  })

  return parseResponse(response)
}
