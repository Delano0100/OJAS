import { useEffect, useState } from 'react'
import { getAlerts } from '../services/device.service'

export const useAlerts = () => {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await getAlerts()
        setAlerts(data)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [])

  return { alerts, loading, error }
}
