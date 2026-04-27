export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  USER: 'USER',
}

const COMPANY_DOMAIN = '@omkarenergysolutions.com'

export const isCompanyEmail = (email = '') => {
  return email.toLowerCase().endsWith(COMPANY_DOMAIN)
}

export const normalizeEmail = (email = '') => {
  return email.trim().toLowerCase()
}

export const assignPublicRole = (email) => {
  if (isCompanyEmail(email)) {
    return ROLE.SUPER_ADMIN
  }

  return ROLE.USER
}

export const getRoleScopedUserFilter = async (user, UserModel) => {
  if (user.role === ROLE.SUPER_ADMIN) {
    return {}
  }

  if (user.role === ROLE.SUB_ADMIN) {
    const managedUsers = await UserModel.find({ parentId: user._id }, { _id: 1 }).lean()
    const managedIds = managedUsers.map((item) => item._id)
    return { _id: { $in: managedIds } }
  }

  return { _id: user._id }
}
