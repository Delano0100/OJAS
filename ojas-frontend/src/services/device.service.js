import { MOCK_ALERTS } from '../utils/constants'

const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is required')
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Device Service - Real backend API calls
export const getDevices = async () => {
  console.log('[DeviceService] GET /devices request started')

  try {
    const response = await fetch(`${API_BASE_URL}/devices`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()

    console.log('[DeviceService] GET /devices response:', {
      success: json.success,
      count: json.data?.length || 0,
    })

    return json.data || []
  } catch (error) {
    console.error('[DeviceService] GET /devices failed:', error)
    return []
  }
}

export const getDeviceById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      return null
    }

    const json = await response.json()
    return json.data || null
  } catch (error) {
    console.error('❌ Error fetching device:', error.message)
    return null
  }
}

export const getDevicesByType = async (type) => {
  try {
    const devices = await getDevices()
    const normalizedType = type?.toUpperCase()
    const filtered = devices.filter((d) => {
      if (normalizedType === 'END') return d.deviceType === 'END'
      if (normalizedType === 'DCB') return d.deviceType === 'DCB'
      return true
    })

    console.log('[DeviceService] filtered devices:', {
      type: normalizedType,
      count: filtered.length,
    })

    return filtered
  } catch (error) {
    console.error('[DeviceService] filtering failed:', error)
    return []
  }
}

export const getAlerts = async () => {
  // Alerts come from mock data for now
  return Promise.resolve([...MOCK_ALERTS])
}

export const getAlertsByDevice = async (deviceId) => {
  const alerts = MOCK_ALERTS.filter((a) => a.deviceId === deviceId)
  return Promise.resolve(alerts)
}

export const addDevice = async (deviceData) => {
  console.log('[DeviceService] POST /devices request payload:', deviceData)

  try {
    const response = await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(deviceData),
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      const apiErrorMessage = errorPayload?.error?.message || response.statusText
      throw new Error(`API error ${response.status}: ${apiErrorMessage}`)
    }

    const json = await response.json()
    const newDevice = json.data

    console.log('[DeviceService] POST /devices success response:', json)
    return newDevice
  } catch (error) {
    console.error('[DeviceService] POST /devices failed:', error)
    throw error
  }
}

export const getTelemetryHistory = async (deviceId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/telemetry/${deviceId}`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Telemetry API error: ${response.status}`)
    }

    const json = await response.json()
    return Array.isArray(json.data) ? json.data : []
  } catch (error) {
    console.error('[DeviceService] GET /telemetry failed:', error)
    return []
  }
}

export const cleanupTelemetryHistory = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/telemetry/cleanup?days=${Number(days)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error?.message || `Cleanup API error: ${response.status}`)
    }

    const json = await response.json()
    return json.data
  } catch (error) {
    console.error('[DeviceService] DELETE /telemetry/cleanup failed:', error)
    throw error
  }
}

export const updateDevice = async (id, updates) => {
  console.log('Update device:', id, updates)
  // Backend doesn't have update endpoint yet
  return Promise.resolve({ deviceId: id, ...updates })
}

export const deleteDevice = async (id) => {
  console.log('Delete device:', id)
  // Backend doesn't have delete endpoint yet
  return Promise.resolve(true)
}
