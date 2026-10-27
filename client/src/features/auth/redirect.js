export function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  try {
    const target = new URL(value, 'https://freelanceflow.local')
    if (target.origin !== 'https://freelanceflow.local' || /^\/(login|signup)(\/|$)/i.test(target.pathname)) return '/'
    return target.pathname + target.search + target.hash
  } catch {
    return '/'
  }
}
