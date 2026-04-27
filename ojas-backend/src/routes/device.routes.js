import express from 'express'
import { addDevice, getDeviceById, getDevices } from '../controllers/device.controller.js'
import { roleMiddleware, verifyToken } from '../middleware/auth.middleware.js'
import { ROLE } from '../utils/role.utils.js'

const router = express.Router()

// POST /api/devices - Register a new device
router.post('/', verifyToken, roleMiddleware([ROLE.SUPER_ADMIN, ROLE.SUB_ADMIN, ROLE.USER]), addDevice)

// GET /api/devices - Get all devices
router.get('/', verifyToken, roleMiddleware([ROLE.SUPER_ADMIN, ROLE.SUB_ADMIN, ROLE.USER]), getDevices)
router.get('/:id', verifyToken, roleMiddleware([ROLE.SUPER_ADMIN, ROLE.SUB_ADMIN, ROLE.USER]), getDeviceById)

export default router
