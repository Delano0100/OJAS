import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'
import { ROLE, assignPublicRole, normalizeEmail } from '../utils/role.utils.js'

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isRoleSelected: user.isRoleSelected,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'name, email, and password are required',
        },
      })
    }

    const normalizedEmail = normalizeEmail(email)
    const existingUser = await User.findOne({ email: normalizedEmail }).lean()

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email is already registered',
        },
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const finalRole = assignPublicRole(normalizedEmail)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: finalRole,
      isRoleSelected: finalRole === ROLE.SUPER_ADMIN,
    })

    const token = createToken(user)

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isRoleSelected: user.isRoleSelected,
          createdBy: user.createdBy,
        },
      },
      message: 'User registered successfully',
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register user',
      },
    })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'email and password are required',
        },
      })
    }

    const normalizedEmail = normalizeEmail(email)
    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      })
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'This account uses Google login',
        },
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      })
    }

    if (user.role === ROLE.SUPER_ADMIN && !user.isRoleSelected) {
      user.isRoleSelected = true
      await user.save()
    }

    const token = createToken(user)

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isRoleSelected: user.isRoleSelected,
          createdBy: user.createdBy,
        },
      },
      message: 'Login successful',
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
      },
    })
  }
}

export const me = async (req, res) => {
  let createdByUser = null

  if (req.user.createdBy) {
    createdByUser = await User.findById(req.user.createdBy).select('_id name email role').lean()
  }

  return res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isRoleSelected: req.user.isRoleSelected,
      createdBy: createdByUser,
    },
  })
}

export const googleAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Google authentication failed',
        },
      })
    }

    if (req.user.role === ROLE.SUPER_ADMIN && !req.user.isRoleSelected) {
      req.user.isRoleSelected = true
      await req.user.save()
    }

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '')
    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'FRONTEND_URL is not configured',
        },
      })
    }

    const token = createToken(req.user)
    const needsRoleSelection = !req.user.isRoleSelected
    const redirectUrl = `${frontendUrl}/dashboard?token=${encodeURIComponent(token)}${
      needsRoleSelection ? '&needsRoleSelection=true' : ''
    }`

    console.log('User:', req.user)
    console.log('Generated Token:', token)
    console.log('Redirecting to:', redirectUrl)

    return res.redirect(redirectUrl)
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to complete Google authentication',
      },
    })
  }
}

export const setRole = async (req, res) => {
  try {
    const { role } = req.body

    if (!role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'role is required',
        },
      })
    }

    // STRICT RULE: Only allow SUB_ADMIN or USER
    // NEVER allow SUPER_ADMIN from frontend
    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot set role to SUPER_ADMIN',
        },
      })
    }

    if (!['SUB_ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Role must be SUB_ADMIN or USER',
        },
      })
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        role,
        isRoleSelected: true,
      },
      { new: true }
    ).lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      })
    }

    // Create new token with updated role
    const token = createToken(user)

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isRoleSelected: user.isRoleSelected,
        },
      },
      message: 'Role set successfully',
    })
  } catch (error) {
    console.error('Set role error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to set role',
      },
    })
  }
}
