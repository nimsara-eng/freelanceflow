import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'

// Only the compiled client is served; source files and server configuration stay private.
export function addWebClient(app, directory) {
  const index = path.join(directory, 'index.html')
  if (!existsSync(index)) throw new Error('Build the client before starting the public preview.')
  app.use((req, res, next) => {
    try { req.webClientPath = decodeURIComponent(req.path) } catch { return res.sendStatus(400) }
    if (req.webClientPath.includes('\\') || req.webClientPath.split('/').some((part) => part.startsWith('.')) || /^\/(?:src|node_modules|server)(?:\/|$)/.test(req.webClientPath)) return res.sendStatus(404)
    next()
  })
  app.use(express.static(directory, {
    index: false, redirect: false, dotfiles: 'deny',
    setHeaders(res, file) {
      res.set('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache')
    },
  }))
  app.get('/{*page}', (req, res, next) => {
    if (path.extname(req.webClientPath) || !req.accepts('html')) return next()
    res.set('Cache-Control', 'no-store').sendFile(index)
  })
}
