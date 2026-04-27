import express from 'express'
import passport from 'passport'
import { googleAuthSuccess, login, me, register, setRole } from '../controllers/auth.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', verifyToken, me)
router.post('/set-role', verifyToken, setRole)

router.get('/google', (req, res, next) => {
	if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
		return res.status(500).json({
			success: false,
			error: {
				code: 'GOOGLE_AUTH_DISABLED',
				message: 'Google OAuth is not configured',
			},
		})
	}

	return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

router.get(
	'/google/callback',
	passport.authenticate('google', { session: false }),
	googleAuthSuccess
)

export default router
