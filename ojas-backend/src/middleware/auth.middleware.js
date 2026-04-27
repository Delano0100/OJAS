import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing auth token',
        },
      })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.userId)
      .select('_id name email role createdBy parentId')
      .lean()

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid auth token',
        },
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    })
  }
}

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient role permissions',
        },
      })
    }

    next()
  }
}

export const roleMiddleware = (allowedRoles = []) => requireRole(allowedRoles)

export const authMiddleware = verifyToken
