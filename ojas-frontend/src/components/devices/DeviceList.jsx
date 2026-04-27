import mqtt from 'mqtt'
import { useEffect, useMemo, useState } from 'react'
import DeviceCard from './DeviceCard'

const TELEMETRY_CACHE_KEY = 'ojas_recent_telemetry_by_device'

const readTelemetryCache = () => {
  try {
    const raw = localStorage.getItem(TELEMETRY_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const writeTelemetryCache = (cache) => {
  try {
    localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore localStorage failures
  }
}

export default function DeviceList({ devices = [] }) {
  const [filter, setFilter] = useState('all')
  const [recentTelemetryByDevice, setRecentTelemetryByDevice] = useState(() => readTelemetryCache())
  const [liveTick, setLiveTick] = useState(0)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setLiveTick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const client = mqtt.connect(import.meta.env.VITE_MQTT_WS_URL, {
      username: import.meta.env.VITE_MQTT_USERNAME,
      password: import.meta.env.VITE_MQTT_PASSWORD,
      protocol: 'wss',
      reconnectPeriod: 5000,
      clean: true,
      connectTimeout: 20000,
    })

    client.on('connect', () => {
      const topics = devices
        .map((d) => d.topic || `device/${d.deviceId}/telemetry`)
        .filter(Boolean)

      if (!topics.length) {
        return
      }

      client.subscribe(topics, (err, granted) => {
        if (err) {
          console.error('Device topics subscribe failed:', err)
          return
        }

        const rejected = (granted || []).filter((g) => g.qos === 128)
        if (rejected.length > 0) {
          console.error('Some device topic subscriptions were rejected (QoS 128):', rejected)
        }
      })
    })

    client.on('message', (topic) => {
      const match = topic.match(/^device\/([^/]+)\/telemetry$/)
      if (!match) {
        return
      }

      const topicDeviceId = match[1]
      setRecentTelemetryByDevice((prev) => {
        const next = {
          ...prev,
          [topicDeviceId]: Date.now(),
        }
        writeTelemetryCache(next)
        return next
      })
    })

    return () => {
      client.end(true)
    }
  }, [devices])

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (filter === 'all') return true
      return d.deviceType === filter
    })
  }, [devices, filter])

  const getCardStatus = (device) => {
    const LIVE_WINDOW_MS = 30000
    const recentAt = recentTelemetryByDevice[device.deviceId]
    const isLive = recentAt ? Date.now() - recentAt <= LIVE_WINDOW_MS : false

    if (isLive) {
      return { label: 'Live', variant: 'live' }
    }

    const backendOnline = device.status === 'online'
    return {
      label: backendOnline ? 'Online' : 'Offline',
      variant: backendOnline ? 'online' : 'offline',
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-3">
        {['all', 'END', 'DCB'].map((type) => {
          const count =
            type === 'all'
              ? devices.length
              : devices.filter((d) => d.deviceType === type).length
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-primary text-white'
                  : 'bg-border/20 text-textSecondary hover:text-textPrimary'
              }`}
            >
              {type === 'all' ? 'All Devices' : type} ({count})
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((device) => (
          <DeviceCard
            key={device.deviceId}
            device={device}
            cardStatus={getCardStatus(device)}
            lastSeenAt={recentTelemetryByDevice[device.deviceId] || device.lastSeen}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-textSecondary">
            {devices.length === 0
              ? 'No devices found. Click "Add Device" to create one.'
              : `No ${filter} devices found`}
          </p>
        </div>
      )}
    </div>
  )
}
