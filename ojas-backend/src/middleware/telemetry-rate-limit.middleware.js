const WINDOW_MS = Number(process.env.TELEMETRY_RATE_LIMIT_WINDOW_MS || 60000)
const MAX_REQUESTS = Number(process.env.TELEMETRY_RATE_LIMIT_MAX || 120)

const buckets = new Map()

const getClientKey = (req) => {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.ip || 'unknown'
}

const clearExpiredBuckets = (now) => {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export const telemetryRateLimit = (req, res, next) => {
  const now = Date.now()
  clearExpiredBuckets(now)

  const key = getClientKey(req)
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    })
    return next()
  }

  if (existing.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000)
    res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)))

    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many telemetry requests. Try again in ${retryAfterSeconds}s.`,
      },
    })
  }

  existing.count += 1
  return next()
}

export default telemetryRateLimit
