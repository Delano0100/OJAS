import { useContext } from 'react'
import { MQTTContext } from '../context/MQTTContext'

export const useMQTT = () => {
  const context = useContext(MQTTContext)
  if (!context) {
    return { connected: false, data: null, connect: () => {}, disconnect: () => {} }
  }
  return context
}
