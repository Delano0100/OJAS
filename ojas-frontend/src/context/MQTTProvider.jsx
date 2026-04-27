import { useState, useCallback } from 'react'
import { connectMQTT, disconnect } from '../services/mqtt.service'
import { MQTTContext } from './MQTTContext'

export function MQTTProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState(null)

  const connect = useCallback(async () => {
    try {
      await connectMQTT('mqtt://stub', {})
      setConnected(true)
    } catch (err) {
      console.error('MQTT connection failed:', err)
      setConnected(false)
    }
  }, [])

  const disconnectMQTT = useCallback(async () => {
    try {
      await disconnect()
      setConnected(false)
    } catch (err) {
      console.error('MQTT disconnect failed:', err)
    }
  }, [])

  const value = {
    connected,
    data,
    connect,
    disconnect: disconnectMQTT,
    setData,
  }

  return <MQTTContext.Provider value={value}>{children}</MQTTContext.Provider>
}
