import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

// This command creates and removes only its own synthetic database; never reuse .env.
const dbName = `freelanceflow_mvp_qa_${randomBytes(8).toString('hex')}`
const uri = `mongodb://127.0.0.1:27017/${dbName}`
const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'freelanceflow-mvp-'))
const socket = net.createServer()
await new Promise((resolve, reject) => {
  socket.once('error', reject)
  socket.listen(0, '127.0.0.1', resolve)
})
const port = socket.address().port
await new Promise((resolve) => socket.close(resolve))
const serverFile = fileURLToPath(new URL('../server.js', import.meta.url))
const api = spawn(process.execPath, [serverFile], {
  cwd: empty,
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    MONGODB_URI: uri,
    CLIENT_URL: 'http://127.0.0.1:5174',
    SESSION_SECRET: randomBytes(48).toString('hex'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let apiExited = false
const apiClosed = new Promise((resolve) =>
  api.once('exit', () => {
    apiExited = true
    resolve()
  }),
)
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error('Isolated API did not start. Check the local MongoDB service.')),
      20000,
    )
    api.stdout.on('data', (chunk) => {
      if (String(chunk).includes(`Server running at http://127.0.0.1:${port}`)) {
        clearTimeout(timer)
        resolve()
      }
    })
    api.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    api.once('exit', (code) => {
      clearTimeout(timer)
      reject(Error(`Isolated API exited with code ${code}.`))
    })
    api.stderr.on('data', (chunk) => process.stderr.write(chunk))
  })
  const check = spawn(
    process.execPath,
    [fileURLToPath(new URL('./mvp-api.check.mjs', import.meta.url))],
    {
      cwd: empty,
      windowsHide: true,
      env: { ...process.env, MVP_QA_RUN: 'isolated', MVP_QA_URL: `http://127.0.0.1:${port}` },
      stdio: 'inherit',
    },
  )
  const code = await new Promise((resolve, reject) => {
    check.once('exit', resolve)
    check.once('error', reject)
  })
  if (code !== 0) process.exitCode = 1
} finally {
  if (!apiExited) {
    api.kill()
    await apiClosed
  }
  if (!/^freelanceflow_mvp_qa_[a-f0-9]{16}$/.test(dbName)) throw Error('Invalid QA cleanup target.')
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    if (mongoose.connection.name !== dbName) throw Error('Unexpected cleanup database.')
    await mongoose.connection.dropDatabase()
    console.log('Cleaned up the isolated synthetic MVP database.')
  } finally {
    await mongoose.disconnect()
  }
  // The temporary folder contains no .env, source files, or user data.
  await fs.rmdir(empty)
}
