export const dayMs = 86400000
export function dayIn(value, zone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}
export function localInput(value, zone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(value))
      .map((x) => [x.type, x.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
export function toUtc(value, zone) {
  return new Date(`${value}:00${zone === 'Asia/Colombo' ? '+05:30' : 'Z'}`).toISOString()
}
export function addDays(day, count) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * dayMs).toISOString().slice(0, 10)
}
export function monthDays(month) {
  const first = new Date(`${month}-01T12:00:00Z`),
    offset = (first.getUTCDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => addDays(`${month}-01`, i - offset))
}
export function moveMonth(month, amount) {
  const value = new Date(`${month}-01T12:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + amount)
  return value.toISOString().slice(0, 7)
}
export function elapsed(start, end) {
  const seconds = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 1000))
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`
}
