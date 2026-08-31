// Backend returns naive UTC timestamps (no timezone suffix), which JS would
// otherwise misinterpret as local time. Normalize before parsing.
function toUtcDate(iso) {
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso)
  return new Date(hasTimezone ? iso : `${iso}Z`)
}

export function formatDate(iso) {
  return toUtcDate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateTime(iso) {
  return toUtcDate(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(iso) {
  const diffMs = Date.now() - toUtcDate(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute(s) ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour(s) ago`
  const days = Math.floor(hours / 24)
  return `${days} day(s) ago`
}
