import express from 'express'
import { handshake } from '../controllers/handshake.controller.js'
import { verifyToken, roleMiddleware } from '../middleware/auth.middleware.js'
import { ROLE } from '../utils/role.utils.js'

const router = express.Router()

// GET /api/handshake?deviceId=xxx
router.get(
  '/',
  verifyToken,
  roleMiddleware([ROLE.SUPER_ADMIN, ROLE.SUB_ADMIN, ROLE.USER]),
  handshake
)

export default router