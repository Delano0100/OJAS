import { useContext } from 'react'
import { DeviceContext } from '../context/DeviceContext'

export const useDevices = () => {
  const context = useContext(DeviceContext)
  if (!context) {
    throw new Error('useDevices must be used within DeviceProvider')
  }
  return context
}
