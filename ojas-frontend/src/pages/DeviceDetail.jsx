import mqtt from 'mqtt'
import { ArrowLeft, Download, Handshake, Zap, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDeviceById, getTelemetryHistory } from '../services/device.service'
import Loader from '../components/common/Loader'
import HistoryChart from '../components/charts/HistoryChart'
import { timeAgo } from '../utils/timeAgo'

const TELEMETRY_CACHE_KEY = 'ojas_recent_telemetry_by_device'
const TELEMETRY_PAYLOAD_CACHE_KEY = 'ojas_recent_telemetry_payload_by_device'
const TELEMETRY_HISTORY_CACHE_KEY = 'ojas_recent_telemetry_history_by_device'

const toEpochMs = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? Math.round(value * 1000) : Math.round(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed)
      if (!Number.isFinite(numeric)) return null
      return numeric < 1e12 ? Math.round(numeric * 1000) : Math.round(numeric)
    }

    const parsed = Date.parse(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toIsoTimestamp = (value) => {
  const ms = toEpochMs(value)
  return ms ? new Date(ms).toISOString() : new Date().toISOString()
}

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

const readTelemetryPayloadCache = () => {
  try {
    const raw = localStorage.getItem(TELEMETRY_PAYLOAD_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const writeTelemetryPayloadCache = (cache) => {
  try {
    localStorage.setItem(TELEMETRY_PAYLOAD_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore localStorage failures
  }
}

const readTelemetryHistoryCache = () => {
  try {
    const raw = localStorage.getItem(TELEMETRY_HISTORY_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const writeTelemetryHistoryCache = (cache) => {
  try {
    localStorage.setItem(TELEMETRY_HISTORY_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore localStorage failures
  }
}

export default function DeviceDetailPage() {
  const { id: deviceId } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [telemetryHistory, setTelemetryHistory] = useState([])
  const [selectedMetric, setSelectedMetric] = useState('voltage')
  const [mqttConnected, setMqttConnected] = useState(false)
  const [lastSeen, setLastSeen] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, forceUpdate] = useState(0)
  const clientRef = useRef(null)
  const cleanupTimerRef = useRef(null)
  const subscribedTopicRef = useRef(null)

  // Handshake state
  const [handshakeLoading, setHandshakeLoading] = useState(false)
  const [handshakeResult, setHandshakeResult] = useState(null) // { success: bool, data: any, error: string }

  // Fetch device info once on mount
  useEffect(() => {
    const fetchDevice = async () => {
      try {
        setLoading(true)
        const res = await getDeviceById(deviceId)
        if (!res) {
          setError('Device not found')
          return
        }
        setDevice(res)

        const history = await getTelemetryHistory(res.deviceId)
        const historyCache = readTelemetryHistoryCache()
        const cachedHistory = Array.isArray(historyCache[res.deviceId]) ? historyCache[res.deviceId] : []
        const mergedHistory = [...history, ...cachedHistory]
          .filter((item) => item && (item.timestamp || item.createdAt || item.updatedAt))
          .sort(
            (a, b) =>
              (toEpochMs(b.timestamp || b.createdAt || b.updatedAt) || 0)
              - (toEpochMs(a.timestamp || a.createdAt || a.updatedAt) || 0),
          )

        const dedupedHistory = []
        const seen = new Set()
        for (const item of mergedHistory) {
          const key = `${item.timestamp || item.createdAt || item.updatedAt}-${item.voltage ?? ''}-${item.current ?? ''}-${item.power ?? ''}-${item.energy ?? ''}`
          if (!seen.has(key)) {
            seen.add(key)
            dedupedHistory.push(item)
          }
          if (dedupedHistory.length >= 500) {
            break
          }
        }

        setTelemetryHistory(dedupedHistory)
        historyCache[res.deviceId] = dedupedHistory
        writeTelemetryHistoryCache(historyCache)

        const payloadCache = readTelemetryPayloadCache()
        const cachedPayload = payloadCache[res.deviceId]
        if (cachedPayload && typeof cachedPayload === 'object') {
          setTelemetry(cachedPayload)
        } else if (res.lastTelemetry && typeof res.lastTelemetry === 'object') {
          setTelemetry({
            voltage: res.lastTelemetry.voltage,
            current: res.lastTelemetry.current,
            power: res.lastTelemetry.power,
            temperature: res.lastTelemetry.temperature,
            timestamp: res.lastTelemetry.timestamp,
          })
        }

        const cachedTs = readTelemetryCache()[res.deviceId]
        const backendTs = res.lastSeen ? new Date(res.lastSeen).getTime() : 0
        setLastSeen(Math.max(backendTs, cachedTs || 0) || null)
      } catch (err) {
        console.error('Failed to fetch device:', err)
        setError('Failed to fetch device')
      } finally {
        setLoading(false)
      }
    }

    fetchDevice()
  }, [deviceId])

  // MQTT connection — stable, never recreated unless deviceId changes
  useEffect(() => {
    const topic = device?.topic
    if (!topic) {
      return
    }

    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }

    if (clientRef.current && subscribedTopicRef.current === topic) {
      return
    }

    if (clientRef.current) {
      clientRef.current.end(true)
      clientRef.current = null
      subscribedTopicRef.current = null
    }

    const client = mqtt.connect(import.meta.env.VITE_MQTT_WS_URL, {
      username: import.meta.env.VITE_MQTT_USERNAME,
      password: import.meta.env.VITE_MQTT_PASSWORD,
      protocol: 'wss',
      reconnectPeriod: 5000,
      clean: true,
      connectTimeout: 20000,
    })
    clientRef.current = client

    client.on('connect', () => {
      console.log('MQTT connected')
      setMqttConnected(true)

      console.log('Subscribing to:', topic)
      client.subscribe(topic, (err, granted) => {
        if (err) {
          console.error('Subscription failed:', err)
          return
        }

        const rejected = (granted || []).some((g) => g.qos === 128)
        if (rejected) {
          console.error('Subscription rejected by broker (QoS 128):', granted)
          setMqttConnected(false)
        } else {
          subscribedTopicRef.current = topic
          console.log('Subscribed successfully')
        }
      })
    })

    client.on('message', (topic, message) => {
      console.log('Incoming:', topic, message.toString())
      try {
        const parsed = JSON.parse(message.toString())
        const normalizedTimestamp = toIsoTimestamp(parsed.timestamp)
        console.log('MQTT message received:', topic, parsed)
        setTelemetry((prev) => ({
          ...prev,
          ...parsed,
          timestamp: normalizedTimestamp,
        }))

        setTelemetryHistory((prev) => [
          ...prev,
          {
            ...parsed,
            timestamp: normalizedTimestamp,
          },
        ]
          .sort((a, b) => (toEpochMs(b.timestamp) || 0) - (toEpochMs(a.timestamp) || 0))
          .slice(0, 500))

        const historyCache = readTelemetryHistoryCache()
        historyCache[device?.deviceId || deviceId] = [
          ...(historyCache[device?.deviceId || deviceId] || []),
          {
            ...parsed,
            timestamp: normalizedTimestamp,
          },
        ]
          .sort((a, b) => (toEpochMs(b.timestamp) || 0) - (toEpochMs(a.timestamp) || 0))
          .slice(0, 500)
        writeTelemetryHistoryCache(historyCache)

        const payloadCache = readTelemetryPayloadCache()
        payloadCache[device?.deviceId || deviceId] = {
          ...(payloadCache[device?.deviceId || deviceId] || {}),
          ...parsed,
        }
        writeTelemetryPayloadCache(payloadCache)

        const now = Date.now()
        setLastSeen(now)
        const cache = readTelemetryCache()
        cache[device?.deviceId || deviceId] = now
        writeTelemetryCache(cache)
      } catch (err) {
        console.error('MQTT parse error:', err)
      }
    })

    client.on('error', (err) => {
      console.error('MQTT error:', err)
      setMqttConnected(false)
    })

    client.on('offline', () => {
      setMqttConnected(false)
    })

    client.on('close', () => {
      setMqttConnected(false)
    })

    return () => {
      const clientToClose = client
      cleanupTimerRef.current = setTimeout(() => {
        if (clientRef.current === clientToClose) {
          setMqttConnected(false)
          clientToClose.end(true)
          clientRef.current = null
          subscribedTopicRef.current = null
        }
      }, 150)
    }
  }, [device?.topic])

  // Auto-refresh relative time display every 30 seconds
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const handleHandshake = async () => {
    console.log('Handshake button pressed')
    setHandshakeLoading(true)
    setHandshakeResult(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/handshake?deviceId=${device?.deviceId || deviceId}`)
      const data = await res.json()
      console.log('Handshake response:', data)
      if (!res.ok) {
        setHandshakeResult({ success: false, error: data?.message || `Error ${res.status}` })
      } else {
        setHandshakeResult({ success: true, data })
      }
    } catch (err) {
      console.error('Handshake error:', err)
      setHandshakeResult({ success: false, error: err.message || 'Request failed' })
    } finally {
      setHandshakeLoading(false)
    }
  }

  const handleReadEnergy = () => {
    console.log('Read Energy button pressed')
  }

  if (loading) return <Loader />

  if (error || !device) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/devices')} className="flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="h-5 w-5" />
          Back to Devices
        </button>
        <div className="section-card text-center py-12">
          <p className="text-textSecondary">{error || 'Device not found'}</p>
        </div>
      </div>
    )
  }

  const metricOptions = [
    { key: 'voltage', label: 'Voltage' },
    { key: 'current', label: 'Current' },
    { key: 'power', label: 'Power' },
    { key: 'energy', label: 'Energy' },
  ]

  const historyChartData = telemetryHistory
    .slice()
    .reverse()
    .map((item) => {
      const tsMs = toEpochMs(item?.timestamp)
      const validTs = tsMs ? new Date(tsMs) : null
      return {
        day: validTs ? validTs.toLocaleString() : 'Unknown',
        voltage: item?.voltage ?? null,
        current: item?.current ?? null,
        power: item?.power ?? null,
        energy: item?.energy ?? null,
      }
    })

  const fallbackHistoryRow = telemetry
    ? [{
        timestamp: telemetry.timestamp || (lastSeen ? new Date(lastSeen).toISOString() : new Date().toISOString()),
        voltage: telemetry.voltage ?? null,
        current: telemetry.current ?? null,
        power: telemetry.power ?? null,
        temperature: telemetry.temperature ?? null,
        frequency: telemetry.frequency ?? null,
        powerFactor: telemetry.powerFactor ?? null,
        energy: telemetry.energy ?? null,
      }]
    : []

  const downloadCsv = () => {
    const headers = ['timestamp', 'voltage', 'current', 'power', 'temperature', 'frequency', 'powerFactor', 'energy']
    const sourceRows = telemetryHistory.length > 0 ? telemetryHistory : fallbackHistoryRow
    const rows = sourceRows.map((item) => headers.map((h) => {
      const rawValue = item?.[h] ?? ''
      const value = String(rawValue).replace(/"/g, '""')
      return `"${value}"`
    }).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${device.deviceId}-telemetry.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/devices')} className="mb-4 flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="h-5 w-5" />
          Back to Devices
        </button>

        <div className="section-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary mb-1">{device.name}</h1>
              <div className="space-y-1">
                <p className="text-textSecondary">Device ID: {device.deviceId}</p>
                <p className="text-xs text-textSecondary">Location: {device.location || '--'}</p>
                <p className="text-xs text-textSecondary">Tag: {device.tag || '--'}</p>
                <p className="text-xs text-textSecondary">MQTT Topic: {device.topic}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={mqttConnected ? 'badge-online' : 'badge-offline'}>
                {mqttConnected ? 'Online' : 'Offline'}
              </span>
              <p className="mt-2 text-sm text-textSecondary">
                {lastSeen ? timeAgo(lastSeen) : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-textPrimary">Live Readings</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleHandshake}
              disabled={handshakeLoading}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
            >
              {handshakeLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Handshake className="h-4 w-4" />}
              Handshake
            </button>
            <button
              onClick={handleReadEnergy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              type="button"
            >
              <Zap className="h-4 w-4" />
              Read Energy
            </button>
          </div>
        </div>

        {/* Handshake result banner */}
        {handshakeResult && (
          <div
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              handshakeResult.success
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1">
                  {handshakeResult.success ? 'Handshake Successful' : 'Handshake Failed'}
                </p>
                {handshakeResult.success
                  ? (
                    <pre className="text-xs whitespace-pre-wrap break-all text-textSecondary">
                      {JSON.stringify(handshakeResult.data, null, 2)}
                    </pre>
                  )
                  : <p className="text-xs">{handshakeResult.error}</p>}
              </div>
              <button
                onClick={() => setHandshakeResult(null)}
                className="text-textSecondary hover:text-textPrimary shrink-0 ml-2"
                type="button"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {telemetry ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="section-card">
              <p className="text-xs text-textSecondary">Voltage</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.voltage} V</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Current</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.current} A</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Power</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.power} W</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Frequency</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.frequency} Hz</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Power Factor</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.powerFactor}</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Energy</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.energy} kWh</p>
            </div>
          </div>
        ) : (
          <p>Waiting for MQTT data...</p>
        )}
      </div>

      <div className="section-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-textPrimary">History</h2>
          <div className="flex items-center gap-3">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded-md border border-border/40 bg-surface px-3 py-2 text-sm text-textPrimary"
            >
              {metricOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
              type="button"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>

        {historyChartData.length > 0 ? (
          <HistoryChart
            data={historyChartData}
            dataKey={selectedMetric}
            name={metricOptions.find((m) => m.key === selectedMetric)?.label || 'Metric'}
            color="#22C55E"
          />
        ) : (
          <p className="text-sm text-textSecondary">No telemetry history available yet.</p>
        )}
      </div>
    </div>
  )
}
