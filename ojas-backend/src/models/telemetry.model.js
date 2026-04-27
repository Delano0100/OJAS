import mongoose from 'mongoose'

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    voltage: {
      type: Number,
      default: null,
    },
    current: {
      type: Number,
      default: null,
    },
    power: {
      type: Number,
      default: null,
    },
    temperature: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

telemetrySchema.index({ deviceId: 1, timestamp: 1 })

const Telemetry = mongoose.model('Telemetry', telemetrySchema)

export default Telemetry
