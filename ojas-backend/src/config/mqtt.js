import fs from 'fs'
import path from 'path'
import mqtt from 'mqtt'
import Device from '../models/device.model.js'
import Telemetry from '../models/telemetry.model.js'

const MQTT_URL = process.env.MQTT_URL
const MQTT_USERNAME = process.env.MQTT_USERNAME
const MQTT_PASSWORD = process.env.MQTT_PASSWORD

let mqttClient = null

const STATUS_TOPIC = 'device/+/status'
const TELEMETRY_TOPIC = 'device/+/telemetry'

const normalizeNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return null
  }
  return Number(value)
}

const loadCaCertificate = () => {
  const caPath = process.env.MQTT_CA_CERT_PATH || 'ca.crt'
  const resolvedPath = path.resolve(process.cwd(), caPath)

  if (!fs.existsSync(resolvedPath)) {
    return null
  }

  try {
    return fs.readFileSync(resolvedPath)
  } catch (error) {
    console.warn('Failed to read MQTT CA certificate:', error.message)
    return null
  }
}

const handleStatusMessage = async (topic, payload) => {
  const match = topic.match(/^device\/([^/]+)\/status$/)
  if (!match) {
    return
  }

  const deviceId = match[1]
  const rawMessage = payload?.toString?.() || ''

  let statusPayload = null
  try {
    statusPayload = JSON.parse(rawMessage)
  } catch (error) {
    console.warn('Invalid status payload JSON. Falling back to raw status.', {
      deviceId,
      rawMessage,
    })
    statusPayload = { status: rawMessage }
  }

  const status = statusPayload?.status === 'online' ? 'online' : 'offline'
  const timestamp = statusPayload?.timestamp ? new Date(statusPayload.timestamp) : new Date()
  const safeTimestamp = isNaN(timestamp.getTime()) ? new Date() : timestamp

  console.log('MQTT status update received', {
    deviceId,
    status,
    timestamp: safeTimestamp.toISOString(),
  })

  const update = status === 'online'
    ? { status, lastSeen: safeTimestamp, lastSeenOffline: null }
    : { status, lastSeenOffline: safeTimestamp }

  const result = await Device.updateOne({ deviceId }, update)

  if (!result.matchedCount) {
    console.warn('Status update received for unknown device', { deviceId })
  }
}

const handleTelemetryMessage = async (topic, payload) => {
  const match = topic.match(/^device\/([^/]+)\/telemetry$/)
  if (!match) {
    return
  }

  const deviceId = match[1]
  const rawMessage = payload?.toString?.() || ''

  let telemetryPayload = null
  try {
    telemetryPayload = JSON.parse(rawMessage)
  } catch (error) {
    console.warn('Invalid telemetry payload JSON. Skipping persist.', {
      deviceId,
      rawMessage,
    })
    return
  }

  const timestamp = telemetryPayload?.timestamp ? new Date(telemetryPayload.timestamp) : new Date()
  const safeTimestamp = Number.isNaN(timestamp.getTime()) ? new Date() : timestamp

  const exists = await Telemetry.exists({
    deviceId,
    timestamp: safeTimestamp,
  })

  if (!exists) {
    await Telemetry.create({
      deviceId,
      voltage: normalizeNumber(telemetryPayload?.voltage),
      current: normalizeNumber(telemetryPayload?.current),
      power: normalizeNumber(telemetryPayload?.power),
      temperature: normalizeNumber(telemetryPayload?.temperature),
      timestamp: safeTimestamp,
    })
  }

  await Device.updateOne(
    { deviceId },
    {
      status: 'online',
      lastSeen: safeTimestamp,
      lastSeenOffline: null,
    }
  )
}

const createClient = () => {
  const caCertificate = loadCaCertificate()
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 20000,
    clean: true,
    ...(caCertificate
      ? {
          ca: caCertificate,
          rejectUnauthorized: true,
        }
      : {}),
  })

  client.on('connect', () => {
    console.log('MQTT backend client connected')
    client.subscribe(STATUS_TOPIC, (error) => {
      if (error) {
        console.error('Failed to subscribe to status topic:', error.message)
      }
    })
    client.subscribe(TELEMETRY_TOPIC, (error) => {
      if (error) {
        console.error('Failed to subscribe to telemetry topic:', error.message)
      }
    })
  })

  client.on('error', (error) => {
    console.error('MQTT backend client error:', error.message)
  })

  client.on('close', () => {
    console.warn('MQTT backend client connection closed')
  })

  client.on('reconnect', () => {
    console.log('MQTT backend client reconnecting...')
  })

  client.on('message', (topic, payload) => {
    if (topic.startsWith('device/') && topic.endsWith('/status')) {
      handleStatusMessage(topic, payload).catch((error) => {
        console.error('Failed to process status message:', error.message)
      })
      return
    }

    if (topic.startsWith('device/') && topic.endsWith('/telemetry')) {
      handleTelemetryMessage(topic, payload).catch((error) => {
        console.error('Failed to process telemetry message:', error.message)
      })
    }
  })

  return client
}

export const getMqttClient = () => {
  if (!MQTT_URL || !MQTT_USERNAME || !MQTT_PASSWORD) {
    console.warn('MQTT env vars missing. Skipping MQTT client initialization.')
    return null
  }

  if (mqttClient) {
    return mqttClient
  }

  mqttClient = createClient()

  return mqttClient
}

export const client = getMqttClient()

export default client
