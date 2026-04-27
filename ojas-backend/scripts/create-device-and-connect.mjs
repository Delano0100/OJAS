import mqtt from 'mqtt'

const API_BASE_URL = process.env.API_BASE_URL
const API_TOKEN = process.env.API_TOKEN
const MQTT_URL = process.env.MQTT_URL

if (!API_BASE_URL || !API_TOKEN || !MQTT_URL) {
  console.error('Missing required env vars: API_BASE_URL, API_TOKEN, MQTT_URL')
  process.exit(1)
}

const payload = {
  name: `Test Device ${Date.now()}`,
  deviceType: 'END',
  location: 'Test Lab',
  tag: 'TEST',
  description: 'Provisioned by script',
}

const createDevice = async () => {
  const response = await fetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(errorPayload?.error?.message || `Failed to create device (${response.status})`)
  }

  const json = await response.json()
  return json?.data
}

const connectWithCredentials = async ({ deviceId, mqttUsername, mqttPassword }) => {
  const statusTopic = `device/${deviceId}/status`
  const client = mqtt.connect(MQTT_URL, {
    username: mqttUsername,
    password: mqttPassword,
    reconnectPeriod: 0,
    connectTimeout: 20000,
    will: {
      topic: statusTopic,
      payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
      qos: 1,
      retain: true,
    },
  })

  return new Promise((resolve, reject) => {
    client.on('connect', () => {
      client.publish(
        statusTopic,
        JSON.stringify({ status: 'online', timestamp: Date.now() }),
        { qos: 1, retain: true },
        (error) => {
          if (error) {
            reject(error)
            client.end(true)
            return
          }

          client.end(true)
          resolve()
        }
      )
    })

    client.on('error', (error) => {
      reject(error)
    })
  })
}

try {
  const device = await createDevice()

  if (!device?.mqttUsername || !device?.mqttPassword) {
    throw new Error('Device credentials were not returned at creation time')
  }

  console.log('Created device:')
  console.log({
    deviceId: device.deviceId,
    mqttUsername: device.mqttUsername,
    mqttPassword: device.mqttPassword,
    topic: device.topic,
  })

  await connectWithCredentials(device)
  console.log('MQTT connection test succeeded')
} catch (error) {
  console.error('Test failed:', error.message)
  process.exit(1)
}
