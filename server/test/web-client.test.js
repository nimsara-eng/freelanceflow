import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { addWebClient } from '../services/webClient.js'

test('public client serves built pages and assets without exposing source, configuration or missing files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ff-web-client-'))
  let server
  try {
    await mkdir(path.join(directory, 'assets'))
    await writeFile(path.join(directory, 'index.html'), '<html>FreelanceFlow test client</html>')
    await writeFile(path.join(directory, 'assets', 'app-test.js'), 'console.log("built asset")')
    await writeFile(path.join(directory, '.env'), 'must-never-be-served')
    const app = express()
    app.use('/api', (_req, res) => res.status(404).json({ success: false }))
    addWebClient(app, directory)
    server = app.listen(0, '127.0.0.1')
    await new Promise((resolve) => server.once('listening', resolve))
    const base = `http://127.0.0.1:${server.address().port}`
    for (const route of ['/', '/login', '/reviews/project-test', '/settings']) {
      const response = await fetch(base + route)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.match(await response.text(), /FreelanceFlow test client/)
    }
    const asset = await fetch(base + '/assets/app-test.js')
    assert.equal(asset.status, 200)
    assert.match(asset.headers.get('cache-control'), /immutable/)
    for (const route of ['/.env', '/%2eenv', '/server/server.js', '/src/App.jsx', '/node_modules/', '/assets/missing.js', '/api/unknown']) {
      const response = await fetch(base + route)
      assert.equal(response.status, 404, route)
      assert.doesNotMatch(await response.text(), /must-never-be-served|FreelanceFlow test client/)
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve))
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
    assert.match(path.basename(directory), /^ff-web-client-/)
    await rm(directory, { recursive: true, force: true })
  }
})
