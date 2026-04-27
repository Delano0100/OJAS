import mqtt from 'mqtt'
import 'dotenv/config'

const MQTT_URL = process.env.MQTT_URL
const MQTT_USERNAME = process.env.MQTT_USERNAME
const MQTT_PASSWORD = process.env.MQTT_PASSWORD

const DEFAULT_DEVICE_ID = 'END-1775027607657'
const DEVICE_IDS_SOURCE = process.env.DEVICE_IDS || process.env.DEVICE_ID || process.argv.slice(2).join(',') || DEFAULT_DEVICE_ID
const DEFAULT_SIMULATION_DURATION = 30000
const DEFAULT_PUBLISH_INTERVAL = 3000

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

if (!MQTT_URL || !MQTT_USERNAME || !MQTT_PASSWORD) {
  throw new Error('Missing MQTT env vars. Set MQTT_URL, MQTT_USERNAME, and MQTT_PASSWORD.')
}

const parsedDuration = Number(process.env.SIMULATION_DURATION || DEFAULT_SIMULATION_DURATION)
const SIMULATION_DURATION = Number.isFinite(parsedDuration) && parsedDuration > 0
  ? parsedDuration
  : DEFAULT_SIMULATION_DURATION

const parsedInterval = Number(process.env.PUBLISH_INTERVAL || DEFAULT_PUBLISH_INTERVAL)
const PUBLISH_INTERVAL_MS = Number.isFinite(parsedInterval)
  ? clamp(parsedInterval, 2000, 5000)
  : DEFAULT_PUBLISH_INTERVAL

const round = (value, digits = 1) => Number(value.toFixed(digits))

const hashString = (input) => {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

const createSeededRandom = (seed) => {
  let state = seed % 2147483647

  if (state <= 0) {
    state += 2147483646
  }

  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

const parseDeviceIds = (source) => {
  const ids = source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    throw new Error('Provide at least one device ID via DEVICE_ID, DEVICE_IDS, or CLI args.')
  }

  return ids
}

const createDeviceState = (deviceId) => {
  const seed = hashString(deviceId)
  const random = createSeededRandom(seed)
  const typeBias = deviceId.startsWith('DCB-') ? 1.18 : 1
  const baseVoltage = 229.6 + random() * 2.8
  const baseCurrent = 6.2 + random() * 4.5 * typeBias

  return {
    deviceId,
    random,
    tick: 0,
    phase: random() * Math.PI * 2,
    voltage: baseVoltage,
    current: baseCurrent,
    temperature: 29 + random() * 4,
    ambient: 25 + random() * 2,
    maxCurrent: 12 + random() * 4 * typeBias,
  }
}

const updateState = (state) => {
  state.tick += 1

  const elapsed = state.tick * 0.35
  const loadWave = 0.55
    + 0.25 * Math.sin(elapsed * 0.22 + state.phase)
    + 0.12 * Math.sin(elapsed * 0.07 + state.phase * 1.7)
    + 0.08 * Math.sin(elapsed * 0.015 + state.phase * 2.1)

  const currentTarget = clamp(
    4.8 + loadWave * (state.maxCurrent - 4.8),
    3.8,
    state.maxCurrent
  )

  const currentNoise = (state.random() - 0.5) * 0.12
  state.current = clamp(state.current + (currentTarget - state.current) * 0.18 + currentNoise, 3.2, 18)

  const voltageTarget = clamp(
    232.4 + 1.8 * Math.sin(elapsed * 0.05 + state.phase * 0.4) - (state.current - 8) * 0.18,
    220,
    240
  )
  const voltageNoise = (state.random() - 0.5) * 0.08
  state.voltage = clamp(state.voltage + (voltageTarget - state.voltage) * 0.12 + voltageNoise, 220, 240)

  const activePower = state.voltage * state.current
  const temperatureTarget = clamp(
    state.ambient + 3.5 + state.current * 0.95 + Math.pow(state.current / 10, 2) * 2.2,
    state.ambient,
    72
  )
  const temperatureNoise = (state.random() - 0.5) * 0.05
  state.temperature = clamp(state.temperature + (temperatureTarget - state.temperature) * 0.08 + temperatureNoise, state.ambient, 75)

  const status = state.current > 12 ? 'HIGH_LOAD' : 'NORMAL'

  return {
    voltage: round(state.voltage, 1),
    current: round(state.current, 1),
    power: Math.round(activePower),
    temperature: round(state.temperature, 1),
    status,
    timestamp: new Date().toISOString(),
  }
}

const publishReading = (client, deviceId, reading) => {
  const topic = `device/${deviceId}/telemetry`
  console.log(`Publishing to topic: ${topic}`)

  client.publish(topic, JSON.stringify(reading), { qos: 1 }, (err) => {
    if (err) {
      console.error(`Publish failed for ${deviceId}:`, err.message)
      return
    }

    console.log(`Published data (${deviceId}):`, reading)
  })
}

const publishCycle = (client, deviceStates) => {
  console.log('Publishing data...')
  deviceStates.forEach((state) => {
    const reading = updateState(state)
    publishReading(client, state.deviceId, reading)
  })
}

const startSimulator = () => {
  const deviceIds = parseDeviceIds(DEVICE_IDS_SOURCE)
  const deviceStates = deviceIds.map(createDeviceState)

  const client = mqtt.connect(MQTT_URL, {
    clientId: `ojas_sim_${Date.now()}`,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 20000,
    clean: true,
  })

  let publishTimer = null
  let stopTimer = null
  let isStopped = false

  const clearTimers = () => {
    if (publishTimer) {
      clearInterval(publishTimer)
      publishTimer = null
    }

    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
  }

  const stopSimulation = (reason = 'Simulation stopped') => {
    if (isStopped) {
      return
    }

    isStopped = true
    clearTimers()
    console.log(reason)

    client.end(true, {}, () => {
      process.exit(0)
    })
  }

  const startPublishing = () => {
    if (isStopped) {
      return
    }

    if (publishTimer) {
      clearInterval(publishTimer)
    }

    console.log('Publishing started')
    publishCycle(client, deviceStates)

    publishTimer = setInterval(() => {
      publishCycle(client, deviceStates)
    }, PUBLISH_INTERVAL_MS)
  }

  const scheduleAutoStop = () => {
    if (stopTimer) {
      return
    }

    stopTimer = setTimeout(() => {
      stopSimulation('Simulation stopped')
    }, SIMULATION_DURATION)
  }

  process.on('SIGINT', () => {
    stopSimulation('Simulation stopped')
  })

  process.on('SIGTERM', () => {
    stopSimulation('Simulation stopped')
  })

  client.on('connect', () => {
    console.log('Connected to MQTT')
    console.log(`Devices: ${deviceIds.join(', ')}`)
    console.log(`Interval: ${PUBLISH_INTERVAL_MS}ms | Duration: ${SIMULATION_DURATION}ms`)

    deviceIds.forEach((deviceId) => {
      console.log(`Simulating device: ${deviceId} -> device/${deviceId}/telemetry`)
    })

    scheduleAutoStop()
    startPublishing()
  })

  client.on('reconnect', () => {
    console.log('Reconnecting to broker')
  })

  client.on('offline', () => {
    console.log('Client offline')
  })

  client.on('close', () => {
    console.log('Connection closed')
  })

  client.on('error', (error) => {
    console.error('MQTT error:', error.message)
  })
}

try {
  startSimulator()
} catch (error) {
  console.error('Simulator failed:', error.message)
  process.exit(1)
}
