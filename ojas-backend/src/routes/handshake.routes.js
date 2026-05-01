import express from 'express'
import axios from 'axios'
import mqttClient from '../config/mqtt.js' // 👈 your existing mqtt client

const router = express.Router()

const DLMS_BASE_URL = 'https://ojas-dlms-service.onrender.com'

// Wraps a one-time MQTT subscription in a promise with a timeout
function waitForMqttMessage(topic, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      mqttClient.unsubscribe(topic)
      reject(new Error(`MQTT timeout: no message received on topic "${topic}" within ${timeoutMs}ms`))
    }, timeoutMs)

    mqttClient.subscribe(topic, (err) => {
      if (err) {
        clearTimeout(timer)
        return reject(new Error(`MQTT subscribe error: ${err.message}`))
      }
    })

    mqttClient.once('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        clearTimeout(timer)
        mqttClient.unsubscribe(topic)
        resolve(message.toString('hex')) // raw binary → hex string
      }
    })
  })
}

// GET /api/handshake?sid=<session_id>
router.get('/', async (req, res) => {
  const { sid } = req.query
  console.log(`\nGetting there ${sid}`)

  if (!sid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAM',
        message: 'Missing required query param: sid (session id)',
      },
    })
  }

  try {
    // ── Step 1: Call DLMS service ─────────────────────────────────────────────
    const dlmsEnocodeResponse = await axios.get(`${DLMS_BASE_URL}/encode/handshake`, {
      params: { sid },
      timeout: 20000,
    })

    // ── Step 2: Subscribe and wait for one message ────────────────────────────
    const SUBSCRIBE_TOPIC = `device/${sid}/telemetry`  // 👈 customize
   
    // ── Step 3: Publish combined data ─────────────────────────────────────────
    const PUBLISH_TOPIC = `device/${sid}/command`      // 👈 customize

    const rawBuffer = Buffer.from(dlmsEnocodeResponse.data.raw_hex, 'hex')

mqttClient.publish(PUBLISH_TOPIC, rawBuffer, { qos: 1 }, (err) => {
  if (err) console.error('[MQTT] Publish error:', err.message)
  else console.log(`[MQTT] Published raw bytes to ${PUBLISH_TOPIC}`)
})
  
  

     const mqttData = await waitForMqttMessage(SUBSCRIBE_TOPIC, 10000)


    //  const dlmsDecodeResponse = await axios.post(`${DLMS_BASE_URL}/decode/handshake`, {
    //   params: { sid },
    //   timeout: 20000,
    // })

      const dlmsDecodeResponse = await axios.post(`${DLMS_BASE_URL}/decode/handshake`,{ 
        raw_hex: mqttData },        // 👈 body
        {
            params: { sid },             // 👈 query param ?sid=...
            timeout: 20000,
        })

    // ── Step 4: Return response ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      // dlms: dlmsResponse.data,
       handshake: dlmsDecodeResponse.data,
    })

  } catch (error) {
    // MQTT timeout or subscribe error
    if (error.message?.startsWith('MQTT')) {
      return res.status(504).json({
        success: false,
        error: { code: 'MQTT_ERROR', message: error.message },
      })
    }

    // DLMS HTTP error
    if (error.response) {
      return res.status(error.response.status).json(error.response.data)
    }

    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    })
  }
})

export default router
