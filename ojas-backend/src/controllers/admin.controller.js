import bcrypt from 'bcryptjs'
import User from '../models/user.model.js'
import { ROLE, assignPublicRole, normalizeEmail } from '../utils/role.utils.js'

const createManagedUser = async ({ name, email, password, role, createdBy }) => {
  const normalizedEmail = normalizeEmail(email)

  if (!name || !normalizedEmail || !password) {
    throw new Error('name, email, and password are required')
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).lean()

  if (existingUser) {
    throw new Error('Email is already registered')
  }

  // Company emails are always SUPER_ADMIN regardless of requested role.
  const finalRole = assignPublicRole(normalizedEmail) === ROLE.SUPER_ADMIN ? ROLE.SUPER_ADMIN : role

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: finalRole,
    isRoleSelected: true,
    createdBy,
    parentId: createdBy,
  })

  return user
}

export const createSubAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const user = await createManagedUser({
      name,
      email,
      password,
      role: ROLE.SUB_ADMIN,
      createdBy: req.user._id,
    })

    return res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        parentId: user.parentId,
        createdBy: user.createdBy,
      },
      message: 'Sub-admin created successfully',
    })
  } catch (error) {
    const status = error.message.includes('already') || error.message.includes('required') ? 400 : 500
    return res.status(status).json({
      success: false,
      error: {
        code: status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR',
        message: error.message,
      },
    })
  }
}

export const createUserBySubAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const user = await createManagedUser({
      name,
      email,
      password,
      role: ROLE.USER,
      createdBy: req.user._id,
    })

    return res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        parentId: user.parentId,
        createdBy: user.createdBy,
      },
      message: 'User created successfully',
    })
  } catch (error) {
    const status = error.message.includes('already') || error.message.includes('required') ? 400 : 500
    return res.status(status).json({
      success: false,
      error: {
        code: status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR',
        message: error.message,
      },
    })
  }
}

export const getUsersByRoleScope = async (req, res) => {
  try {
    let filter = {}

    if (req.user.role === ROLE.SUB_ADMIN) {
      filter = { parentId: req.user._id }
    }

    if (req.user.role === ROLE.USER) {
      filter = { _id: req.user._id }
    }

    const users = await User.find(filter)
      .select('_id name email role parentId createdBy createdAt')
      .sort({ createdAt: -1 })
      .lean()

    return res.status(200).json({
      success: true,
      data: users,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch users',
      },
    })
  }
}
