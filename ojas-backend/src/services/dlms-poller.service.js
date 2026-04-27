import axios from 'axios'
import Device from '../models/device.model.js'
import Telemetry from '../models/telemetry.model.js'
import { getMqttClient } from '../config/mqtt.js'

const DLMS_SERVICE_URL = process.env.DLMS_SERVICE_URL || 'http://localhost:8086'
const DLMS_SERVICE_TIMEOUT_MS = Number(process.env.DLMS_SERVICE_TIMEOUT_MS || 15000)
const DLMS_POLL_INTERVAL_MS = Number(process.env.DLMS_POLL_INTERVAL_MS || 10000)
const DLMS_POLLING_ENABLED = String(process.env.DLMS_POLLING_ENABLED || 'false').toLowerCase() === 'true'
const DLMS_SERVICE_API_KEY = process.env.DLMS_SERVICE_API_KEY || ''

const DEFAULT_OBIS_MAP = {
  voltage: '1.0.32.7.0.255',
  current: '1.0.31.7.0.255',
  energy: '1.0.1.8.0.255',
}

let pollTimer = null
let pollInFlight = false

const toNumberOrNull = (value) => {
  if (value === undefined || value === null) {
    return null
  }

  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const buildDlmsReadPayload = (device) => {
  const dlms = device.dlms || {}

  return {
    deviceId: device.deviceId,
    transport: dlms.transport || (dlms.serialPort ? 'serial' : 'tcp'),
    connection: {
      host: dlms.host || null,
      port: dlms.port || null,
      serialPort: dlms.serialPort || null,
      baudRate: dlms.baudRate || null,
      clientAddress: dlms.clientAddress ?? 16,
      serverAddress: dlms.serverAddress ?? 1,
      authentication: dlms.authentication || 'NONE',
      password: dlms.password || null,
      security: dlms.security || 'NONE',
      systemTitle: dlms.systemTitle || null,
      blockCipherKey: dlms.blockCipherKey || null,
      authenticationKey: dlms.authenticationKey || null,
    },
    obisMap: {
      ...DEFAULT_OBIS_MAP,
      ...(dlms.obisMap || {}),
    },
  }
}

const publishTelemetryToMqtt = (deviceId, payload) => {
  const mqttClient = getMqttClient()
  if (!mqttClient?.connected) {
    console.warn('DLMS poller: MQTT client unavailable. Skipping publish.', { deviceId })
    return
  }

  const topic = `device/${deviceId}/telemetry`
  mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
    if (error) {
      console.error('DLMS poller: MQTT publish failed', { deviceId, topic, message: error.message })
    }
  })
}

const persistTelemetrySnapshot = async (deviceId, metrics, timestamp) => {
  await Telemetry.create({
    deviceId,
    voltage: toNumberOrNull(metrics.voltage),
    current: toNumberOrNull(metrics.current),
    power: toNumberOrNull(metrics.power),
    temperature: toNumberOrNull(metrics.temperature),
    timestamp,
  })
}

const pollSingleDlmsDevice = async (device) => {
  const requestPayload = buildDlmsReadPayload(device)

  const response = await axios.post(`${DLMS_SERVICE_URL}/api/read`, requestPayload, {
    timeout: DLMS_SERVICE_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      ...(DLMS_SERVICE_API_KEY ? { 'x-dlms-api-key': DLMS_SERVICE_API_KEY } : {}),
    },
  })

  const data = response?.data || {}
  const telemetry = data.metrics || data.telemetry || {}
  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()

  const outgoingPayload = {
    ...telemetry,
    source: 'DLMS',
    timestamp,
  }

  await persistTelemetrySnapshot(device.deviceId, outgoingPayload, timestamp)
  publishTelemetryToMqtt(device.deviceId, outgoingPayload)

  await Device.updateOne(
    { _id: device._id },
    {
      status: 'online',
      lastSeen: timestamp,
      lastSeenOffline: null,
    }
  )

  console.log('DLMS poll success', {
    deviceId: device.deviceId,
    topic: `device/${device.deviceId}/telemetry`,
    timestamp: timestamp.toISOString(),
  })
}

const markDevicePollFailure = async (device, error) => {
  const now = new Date()
  await Device.updateOne(
    { _id: device._id },
    {
      status: 'offline',
      lastSeenOffline: now,
    }
  )

  console.error('DLMS poll failed', {
    deviceId: device.deviceId,
    message: error?.message || String(error),
  })
}

const pollCycle = async () => {
  if (pollInFlight) {
    return
  }

  pollInFlight = true
  try {
    const dlmsDevices = await Device.find({
      $or: [
        { sourceType: 'DLMS' },
        { 'dlms.enabled': true },
      ],
    }).lean()

    if (!dlmsDevices.length) {
      return
    }

    await Promise.allSettled(
      dlmsDevices.map(async (device) => {
        try {
          await pollSingleDlmsDevice(device)
        } catch (error) {
          await markDevicePollFailure(device, error)
        }
      })
    )
  } catch (error) {
    console.error('DLMS poll cycle failure:', error.message)
  } finally {
    pollInFlight = false
  }
}

export const startDlmsPolling = () => {
  if (!DLMS_POLLING_ENABLED) {
    console.log('DLMS polling disabled. Set DLMS_POLLING_ENABLED=true to enable.')
    return
  }

  if (pollTimer) {
    return
  }

  const safeInterval = Number.isFinite(DLMS_POLL_INTERVAL_MS) && DLMS_POLL_INTERVAL_MS > 1000
    ? DLMS_POLL_INTERVAL_MS
    : 10000

  console.log('DLMS polling started', {
    intervalMs: safeInterval,
    serviceUrl: DLMS_SERVICE_URL,
  })

  pollCycle().catch((error) => {
    console.error('Initial DLMS poll failed:', error.message)
  })

  pollTimer = setInterval(() => {
    pollCycle().catch((error) => {
      console.error('Scheduled DLMS poll failed:', error.message)
    })
  }, safeInterval)
}

export const stopDlmsPolling = () => {
  if (!pollTimer) {
    return
  }

  clearInterval(pollTimer)
  pollTimer = null
}
