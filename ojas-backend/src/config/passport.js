import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/user.model.js'
import { assignPublicRole, normalizeEmail } from '../utils/role.utils.js'

export const configurePassport = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL

  if (!clientId || !clientSecret || !callbackUrl) {
    console.warn('Google OAuth env vars are missing. Google login is disabled.')
    return
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = normalizeEmail(profile.emails?.[0]?.value || '')

          if (!email) {
            return done(new Error('Google account has no email address'))
          }

          const existingUser = await User.findOne({ email })

          if (existingUser) {
            if (!existingUser.googleId) {
              existingUser.googleId = profile.id
              await existingUser.save()
            }
            return done(null, existingUser)
          }

          // For new users, check if they're from company domain
          const isCompanyEmail = email.endsWith('@omkarenergysolutions.com')
          
          const user = await User.create({
            name: profile.displayName || 'Google User',
            email,
            googleId: profile.id,
            role: isCompanyEmail ? 'SUPER_ADMIN' : null,
            isRoleSelected: isCompanyEmail ? true : false,
          })

          return done(null, user)
        } catch (error) {
          return done(error)
        }
      }
    )
  )

  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (error) {
      done(error)
    }
  })
}

export default passport
