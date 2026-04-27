import express from 'express'
import { cleanupTelemetry, getTelemetryByDevice, ingestTelemetry } from '../controllers/telemetry.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import { telemetryRateLimit } from '../middleware/telemetry-rate-limit.middleware.js'

const router = express.Router()

router.post('/', telemetryRateLimit, ingestTelemetry)
router.get('/:deviceId', verifyToken, getTelemetryByDevice)
router.delete('/cleanup', verifyToken, cleanupTelemetry)

export default router
