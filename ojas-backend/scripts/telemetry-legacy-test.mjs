const API_BASE_URL = process.env.API_BASE_URL
const DEVICE_ID = process.env.DEVICE_ID

if (!API_BASE_URL || !DEVICE_ID) {
  console.error('Missing required env vars: API_BASE_URL, DEVICE_ID')
  process.exit(1)
}

const payload = {
  deviceId: DEVICE_ID,
  voltage: 230.5,
  current: 4.2,
  power: 965.7,
  temperature: 38.4,
}

try {
  const response = await fetch(`${API_BASE_URL}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(json?.error?.message || `Telemetry failed (${response.status})`)
  }

  console.log('Legacy telemetry accepted:', json?.data || json)
} catch (error) {
  console.error('Legacy telemetry test failed:', error.message)
  process.exit(1)
}
