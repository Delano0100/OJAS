import mqtt from 'mqtt'

let client = null
let activeTopic = null

// MQTT Broker WebSocket URL
const BROKER_URL = import.meta.env.VITE_MQTT_WS_URL

const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD

export const connectMQTT = async (deviceId, onMessage) => {
  return new Promise((resolve, reject) => {
    try {
      if (!deviceId) {
        reject(new Error('deviceId is required for MQTT connection'))
        return
      }

      if (!MQTT_USERNAME || !MQTT_PASSWORD) {
        reject(new Error('Missing VITE_MQTT_USERNAME or VITE_MQTT_PASSWORD'))
        return
      }

      if (client) {
        client.removeAllListeners()
        client.end(true)
        client = null
      }

      client = mqtt.connect(BROKER_URL, {
        clientId: `web_${deviceId}_${Date.now()}`,
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
        protocol: 'wss',
        clean: true,
        connectTimeout: 20000,
        reconnectPeriod: 5000,
      })

      const topic = String(deviceId).includes('/')
        ? String(deviceId)
        : `device/${deviceId}/telemetry`
      activeTopic = topic
      let settled = false
      let connectionTimer = null

      const settleResolve = () => {
        if (!settled) {
          settled = true
          if (connectionTimer) {
            clearTimeout(connectionTimer)
          }
          resolve(client)
        }
      }

      const settleReject = (error) => {
        if (!settled) {
          settled = true
          if (connectionTimer) {
            clearTimeout(connectionTimer)
          }
          reject(error)
        }
      }

      client.on('connect', () => {
        console.log('MQTT connected')
        console.log('Subscribing to:', topic)

        client.subscribe(topic, (err, granted) => {
          if (err) {
            console.error('Subscribe error:', err)
            settleReject(err)
            return
          }

          const rejected = (granted || []).some((g) => g.qos === 128)
          if (rejected) {
            const subackError = new Error(`Subscription rejected by broker for topic ${topic}`)
            console.error('Subscribe rejected (QoS 128):', granted)
            settleReject(subackError)
          } else {
            settleResolve()
          }
        })
      })

      client.on('message', (receivedTopic, message) => {
        if (receivedTopic !== activeTopic) {
          return
        }

        console.log('MQTT message received:', receivedTopic, message.toString())

        try {
          const parsed = JSON.parse(message.toString())
          if (onMessage) {
            onMessage(parsed)
          }
        } catch (e) {
          console.error('Failed to parse MQTT message:', e)
        }
      })

      client.on('error', (err) => {
        console.error('MQTT error:', err)
        settleReject(err)
      })

      client.on('offline', () => {
        console.log('MQTT client offline')
      })

      client.on('reconnect', () => {
        console.log('MQTT attempting to reconnect...')
      })

      client.on('close', () => {
        console.log('MQTT connection closed')
      })

      connectionTimer = setTimeout(() => {
        if (!client || !client.connected) {
          settleReject(new Error('MQTT connection timeout'))
        }
      }, 10000)
    } catch (err) {
      console.error('MQTT connection error:', err)
      reject(err)
    }
  })
}

export const disconnect = () => {
  return new Promise((resolve) => {
    if (client) {
      client.removeAllListeners()
      client.end(true, () => {
        console.log('Disconnected from MQTT broker')
        client = null
        activeTopic = null
        resolve()
      })
      return
    }

    resolve()
  })
}

export const subscribe = (topic, onMessage) => {
  if (!client) {
    console.error('MQTT client not connected')
    return
  }

  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`Failed to subscribe to ${topic}:`, err)
    } else {
      console.log(`Subscribed to: ${topic}`)
    }
  })

  client.on('message', (receivedTopic, message) => {
    if (receivedTopic === topic) {
      console.log('MQTT message received:', receivedTopic, message.toString())
      try {
        const parsed = JSON.parse(message.toString())
        onMessage(parsed)
      } catch (e) {
        console.error('Failed to parse MQTT message:', e)
      }
    }
  })
}

export const publish = (topic, message) => {
  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      reject(new Error('MQTT client not connected'))
      return
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message)

    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('Publish error:', err)
        reject(err)
      } else {
        console.log(`Published to ${topic}`)
        resolve()
      }
    })
  })
}

export const isConnected = () => {
  return client && client.connected
}
