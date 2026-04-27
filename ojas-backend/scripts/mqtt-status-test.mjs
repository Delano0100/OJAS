import mqtt from 'mqtt'

const MQTT_URL = process.env.MQTT_URL
const DEVICE_ID = process.env.DEVICE_ID
const MQTT_USERNAME = process.env.MQTT_USERNAME
const MQTT_PASSWORD = process.env.MQTT_PASSWORD
const API_BASE_URL = process.env.API_BASE_URL
const API_TOKEN = process.env.API_TOKEN

const STATUS_TOPIC = DEVICE_ID ? `device/${DEVICE_ID}/status` : null

if (!MQTT_URL || !DEVICE_ID || !MQTT_USERNAME || !MQTT_PASSWORD) {
  console.error('Missing required env vars: MQTT_URL, DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD')
  process.exit(1)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchDeviceStatus = async () => {
  if (!API_BASE_URL || !API_TOKEN) {
    console.log('Skipping API check (API_BASE_URL or API_TOKEN not provided)')
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/devices/${DEVICE_ID}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    })

    const payload = await response.json().catch(() => null)
    console.log('Device status response:', payload?.data || payload)
  } catch (error) {
    console.error('Failed to fetch device status:', error.message)
  }
}

const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 0,
  connectTimeout: 20000,
  will: {
    topic: STATUS_TOPIC,
    payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
    qos: 1,
    retain: true,
  },
})

client.on('connect', async () => {
  console.log('MQTT test client connected')

  client.publish(
    STATUS_TOPIC,
    JSON.stringify({ status: 'online', timestamp: Date.now() }),
    { qos: 1, retain: true },
    async (error) => {
      if (error) {
        console.error('Failed to publish online status:', error.message)
        client.end(true)
        return
      }

      console.log('Published online status. Waiting before disconnecting...')
      await wait(2000)
      client.end(true)
    }
  )
})

client.on('error', (error) => {
  console.error('MQTT test client error:', error.message)
})

client.on('close', async () => {
  console.log('MQTT test client closed. Waiting for LWT offline...')
  await wait(3000)
  await fetchDeviceStatus()
  process.exit(0)
})
