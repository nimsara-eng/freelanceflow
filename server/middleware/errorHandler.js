export function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'API route not found.' })
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return _next(error)
  let status = Number(error.statusCode ?? error.status)
  if (!Number.isInteger(status) || status < 400 || status > 599) status = 500
  let message = error.expose && status < 500 ? error.message : 'Something went wrong. Try again.'
  if (error.code === 11000) { status = 409; message = 'Unable to save these details. Check them or sign in.' }
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) { status = 400; message = 'Check the submitted field values.' }
  if (error.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body.' }
  if (error.type === 'entity.too.large') { status = 413; message = 'Request body is too large.' }
  if (error.name === 'MulterError') { status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; message = error.code === 'LIMIT_FILE_SIZE' ? 'Choose a file smaller than 5 MB.' : 'Upload one file using the file field, without extra fields.' }
  if (status >= 500) console.error('API request failed:', error.name ?? 'Error', error.code ?? '')
  res.status(status).json({ success: false, message })
}
