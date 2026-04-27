import Device from '../models/device.model.js'
import Telemetry from '../models/telemetry.model.js'
import { getMqttClient } from '../config/mqtt.js'
import User from '../models/user.model.js'
import { ROLE } from '../utils/role.utils.js'

const normalizeNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return null
  }
  return Number(value)
}

const getAccessibleOwnerIds = async (authUser) => {
  if (authUser.role === ROLE.SUPER_ADMIN) {
    return null
  }

  if (authUser.role === ROLE.SUB_ADMIN) {
    const managedUsers = await User.find({ createdBy: authUser._id }, { _id: 1 }).lean()
    return managedUsers.map((item) => item._id)
  }

  return [authUser._id]
}

export const ingestTelemetry = async (req, res) => {
  try {
    const { deviceId, voltage, current, power, temperature } = req.body

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'deviceId is required',
        },
      })
    }

    const normalizedDeviceId = deviceId.trim().toUpperCase()
    const device = await Device.findOne({ deviceId: normalizedDeviceId }).lean()

    if (!device) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Device not found',
        },
      })
    }

    const telemetryDoc = await Telemetry.create({
      deviceId: normalizedDeviceId,
      voltage: normalizeNumber(voltage),
      current: normalizeNumber(current),
      power: normalizeNumber(power),
      temperature: normalizeNumber(temperature),
    })

    const payload = {
      voltage: telemetryDoc.voltage,
      current: telemetryDoc.current,
      power: telemetryDoc.power,
      temperature: telemetryDoc.temperature,
      timestamp: telemetryDoc.timestamp,
    }

    const topic = `device/${normalizedDeviceId}/telemetry`
    const mqttClient = getMqttClient()

    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          console.error('MQTT publish error:', error.message)
        }
      })
    }

    return res.status(200).json({
      success: true,
      data: telemetryDoc,
      message: 'Telemetry processed',
    })
  } catch (error) {
    console.error('Ingest telemetry error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to ingest telemetry',
      },
    })
  }
}

export const getTelemetryByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params

    const normalizedDeviceId = deviceId.trim().toUpperCase()

    const ownerIds = await getAccessibleOwnerIds(req.user)
    const deviceFilter = {
      deviceId: normalizedDeviceId,
      ...(ownerIds ? { userId: { $in: ownerIds } } : {}),
    }

    const device = await Device.findOne(deviceFilter).lean()

    if (!device) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Device not found',
        },
      })
    }

    const records = await Telemetry.find({ deviceId: normalizedDeviceId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()

    return res.status(200).json({
      success: true,
      data: records,
    })
  } catch (error) {
    console.error('Get telemetry error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch telemetry',
      },
    })
  }
}

export const cleanupTelemetry = async (req, res) => {
  try {
    const rawDays = req.query.days ?? req.body?.days ?? 30
    const days = Number(rawDays)

    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'days must be a positive number',
        },
      })
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const ownerIds = await getAccessibleOwnerIds(req.user)
    const userDevices = await Device.find(ownerIds ? { userId: { $in: ownerIds } } : {}, { deviceId: 1 }).lean()
    const deviceIds = userDevices.map((device) => device.deviceId)

    if (deviceIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          deletedCount: 0,
          cutoff,
          days,
        },
        message: 'No devices found for this user',
      })
    }

    const result = await Telemetry.deleteMany({
      deviceId: { $in: deviceIds },
      timestamp: { $lt: cutoff },
    })

    return res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        cutoff,
        days,
      },
      message: 'Telemetry retention cleanup completed',
    })
  } catch (error) {
    console.error('Telemetry cleanup error:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clean up telemetry',
      },
    })
  }
}
