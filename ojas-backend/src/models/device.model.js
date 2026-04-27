import mongoose from 'mongoose'

const subDeviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
)

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    serialNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    deviceType: {
      type: String,
      required: true,
      enum: ['END', 'DCB'],
      index: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    tag: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    subDevices: {
      type: [subDeviceSchema],
      default: [],
    },
    mqttUsername: {
      type: String,
      unique: true,
      sparse: true,
    },
    mqttPassword: {
      type: String,
      default: null,
    },
    topic: {
      type: String,
      required: true,
    },
    sourceType: {
      type: String,
      enum: ['PUSH', 'DLMS'],
      default: 'PUSH',
      index: true,
    },
    dlms: {
      enabled: {
        type: Boolean,
        default: false,
        index: true,
      },
      transport: {
        type: String,
        enum: ['serial', 'tcp'],
        default: null,
      },
      host: {
        type: String,
        default: null,
        trim: true,
      },
      port: {
        type: Number,
        default: null,
      },
      serialPort: {
        type: String,
        default: null,
        trim: true,
      },
      baudRate: {
        type: Number,
        default: null,
      },
      clientAddress: {
        type: Number,
        default: 16,
      },
      serverAddress: {
        type: Number,
        default: 1,
      },
      authentication: {
        type: String,
        default: 'NONE',
        trim: true,
      },
      password: {
        type: String,
        default: null,
      },
      security: {
        type: String,
        default: 'NONE',
        trim: true,
      },
      systemTitle: {
        type: String,
        default: null,
      },
      blockCipherKey: {
        type: String,
        default: null,
      },
      authenticationKey: {
        type: String,
        default: null,
      },
      pollIntervalSec: {
        type: Number,
        default: null,
      },
      obisMap: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
      index: true,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    lastSeenOffline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const Device = mongoose.model('Device', deviceSchema)

export default Device
