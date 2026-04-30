import axios from 'axios'
import Device from '../models/device.model.js'
import { getMqttClient } from '../config/mqtt.js'

const DLMS_SERVICE_BASE = 'https://ojas-dlms-service.onrender.com'
const DLMS_SERVICE_TIMEOUT_MS = Number(process.env.DLMS_SERVICE_TIMEOUT_MS || 30000)
const HANDSHAKE_MQTT_TIMEOUT_MS = Number(process.env.HANDSHAKE_MQTT_RESPONSE_TIMEOUT_MS || 20000)

/**
 * Subscribe to device/{deviceId}/telemetry, wait for ONE message, then unsubscribe.
 * Resolves with raw message Buffer, rejects on timeout.
 */
const waitForMqttMessage = (deviceId, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const mqttClient = getMqttClient()
    if (!mqttClient?.connected) {
      return reject(new Error('MQTT client is not connected'))
    }

    const topic = `device/${deviceId}/telemetry`
    let settled = false

    const cleanup = () => {
      mqttClient.unsubscribe(topic)
      mqttClient.removeListener('message', onMessage)
    }

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`Timed out waiting for device response on ${topic}`))
    }, timeoutMs)

    const onMessage = (incomingTopic, message) => {
      if (incomingTopic !== topic || settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve(message)
    }

    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        settled = true
        clearTimeout(timer)
        reject(new Error(`MQTT subscribe failed: ${err.message}`))
      }
    })

    mqttClient.on('message', onMessage)
  })
}

/**
 * GET /api/handshake?deviceId=xxx
 *
 * Flow:
 *  1. Load device from DB
 *  2. GET https://ojas-dlms-service.onrender.com/encode/handshake?sid=1
 *     → response: hex bytes string
 *  3. Publish hex bytes to MQTT topic device/{deviceId}/command
 *  4. Wait for hex bytes response on MQTT topic device/{deviceId}/telemetry
 *  5. POST https://ojas-dlms-service.onrender.com/decode/handshake
 *     body: { raw: <hex bytes from device> }
 *     → response: final handshake result
 *  6. Return final result to frontend
 */
export const handshake = async (req, res) => {
  const { deviceId } = req.query

  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    return res.status(400).json({ success: false, message: 'deviceId query parameter is required' })
  }

  const normalizedDeviceId = deviceId.trim().toUpperCase()

  // ── Step 1: Load device from DB ──────────────────────────────────────────
  let device
  try {
    device = await Device.findOne({ deviceId: normalizedDeviceId }).lean()
  } catch (err) {
    console.error('[Handshake] DB error:', err.message)
    return res.status(500).json({ success: false, message: 'Database error' })
  }

  if (!device) {
    return res.status(404).json({ success: false, message: 'Device not found' })
  }

  console.log(`[Handshake] Step 1 — Device loaded: ${normalizedDeviceId}`)

  // ── Step 2: GET /encode/handshake?sid=1 → hex bytes ─────────────────────
  let encodedHex
  try {
    const { data } = await axios.get(`${DLMS_SERVICE_BASE}/encode/handshake`, {
      params: { sid: 1 },
      timeout: DLMS_SERVICE_TIMEOUT_MS,
    })
    encodedHex = typeof data === 'string' ? data : (data.data ?? data.hex ?? data.bytes ?? data)
    console.log(`[Handshake] Step 2 — Encoded hex received:`, encodedHex)
  } catch (err) {
    console.error('[Handshake] Step 2 failed — encode/handshake:', err.message)
    return res.status(502).json({
      success: false,
      message: 'DLMS encode service failed',
      detail: err.message,
    })
  }

  // ── Step 3: Publish hex to MQTT device/{id}/command ─────────────────────
  const mqttClient = getMqttClient()
  if (!mqttClient?.connected) {
    return res.status(503).json({ success: false, message: 'MQTT client is not connected' })
  }

  // Register listener BEFORE publishing to avoid race condition
  const mqttResponsePromise = waitForMqttMessage(normalizedDeviceId, HANDSHAKE_MQTT_TIMEOUT_MS)

  const commandTopic = `device/${normalizedDeviceId}/command`
  try {
    await new Promise((resolve, reject) => {
      mqttClient.publish(commandTopic, String(encodedHex), { qos: 1 }, (err) =>
        err ? reject(err) : resolve()
      )
    })
    console.log(`[Handshake] Step 3 — Published hex to ${commandTopic}`)
  } catch (err) {
    console.error('[Handshake] Step 3 failed — MQTT publish:', err.message)
    return res.status(503).json({
      success: false,
      message: 'Failed to publish command to device via MQTT',
      detail: err.message,
    })
  }

  // ── Step 4: Wait for hex response from device on telemetry topic ─────────
  let deviceRawHex
  try {
    const messageBuffer = await mqttResponsePromise
    deviceRawHex = messageBuffer.toString()
    console.log(`[Handshake] Step 4 — Device response hex received:`, deviceRawHex)
  } catch (err) {
    console.error('[Handshake] Step 4 failed — MQTT wait:', err.message)
    return res.status(504).json({
      success: false,
      message: err.message,
    })
  }

  // ── Step 5: POST /decode/handshake with raw hex → final result ───────────
  let handshakeResult
  try {
    const { data } = await axios.post(
      `${DLMS_SERVICE_BASE}/decode/handshake`,
      { raw: deviceRawHex },
      {
        timeout: DLMS_SERVICE_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    handshakeResult = data
    console.log(`[Handshake] Step 5 — Decode response:`, handshakeResult)
  } catch (err) {
    console.error('[Handshake] Step 5 failed — decode/handshake:', err.message)
    return res.status(502).json({
      success: false,
      message: 'DLMS decode service failed',
      detail: err.message,
    })
  }

  // ── Step 6: Return to frontend ───────────────────────────────────────────
  console.log(`[Handshake] Complete for device ${normalizedDeviceId}`)
  return res.status(200).json({
    success: true,
    message: 'Handshake completed successfully',
    data: handshakeResult,
  })
}