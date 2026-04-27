const API_BASE_URL = process.env.API_BASE_URL
const API_TOKEN = process.env.API_TOKEN

if (!API_BASE_URL || !API_TOKEN) {
  console.error('Missing required env vars: API_BASE_URL, API_TOKEN')
  process.exit(1)
}

const hasSensitiveFields = (device) => {
  return 'mqttPassword' in device || 'mqttUsername' in device
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  })

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.error?.message || `Request failed (${response.status})`)
  }

  return json?.data
}

try {
  const devices = await fetchJson(`${API_BASE_URL}/devices`)

  if (!Array.isArray(devices)) {
    throw new Error('Devices response is not an array')
  }

  const leaked = devices.filter(hasSensitiveFields)
  if (leaked.length > 0) {
    console.error('Sensitive fields found in device list response:', leaked)
    process.exit(1)
  }

  if (devices.length > 0) {
    const first = devices[0]
    const detail = await fetchJson(`${API_BASE_URL}/devices/${first.deviceId}`)

    if (hasSensitiveFields(detail)) {
      console.error('Sensitive fields found in device detail response:', detail)
      process.exit(1)
    }
  }

  console.log('Device API sanitization passed')
} catch (error) {
  console.error('Sanitization test failed:', error.message)
  process.exit(1)
}
