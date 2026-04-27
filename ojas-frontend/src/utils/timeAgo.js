import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export const timeAgo = (timestamp) => {
  if (!timestamp) return 'Never'

  const now = dayjs()
  const then = dayjs(timestamp)

  if (!then.isValid()) {
    return 'Never'
  }

  const diffSeconds = now.diff(then, 'second')
  if (diffSeconds < 60) {
    return 'just now'
  }

  return then.fromNow()
}
