import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = fileURLToPath(new URL('../', import.meta.url))
const clientDirectory = fileURLToPath(new URL('../../client/', import.meta.url))
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill()
  console.log('Public preview stopped. The public link is no longer available.')
  process.exit(code)
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
process.on('exit', () => { for (const child of children) if (child.exitCode === null) child.kill() })

function childProcess(command, args, options = {}) {
  const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options })
  children.push(child)
  return child
}

async function tunnelExecutable() {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('This preview launcher currently supports Windows x64.')
  // Pinned official Cloudflare release, verified against its published GitHub SHA-256 digest.
  const version = '2026.10.6'
  const expected = 'd521b3bf68982165f0d06d76732f22d9a105ef057ff3ae4c0986f3a23190950f'
  const directory = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'FreelanceFlow', 'tools', version)
  const executable = path.join(directory, 'cloudflared.exe')
  let bytes
  try { bytes = await readFile(executable) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!bytes) {
    console.log('Downloading the official Cloudflare tunnel tool…')
    const response = await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-windows-amd64.exe`, { signal: AbortSignal.timeout(120000) })
    if (!response.ok) throw Error('Cloudflare tool download failed.')
    bytes = Buffer.from(await response.arrayBuffer())
  }
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error('Cloudflare tool checksum did not match. Nothing was executed.')
  await mkdir(directory, { recursive: true })
  // Do not rewrite an executable already being used by a different preview.
  try { await readFile(executable) } catch { await writeFile(executable, bytes, { flag: 'wx' }) }
  return executable
}

async function freePort() {
  const socket = net.createServer()
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve) })
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  return port
}

try {
  await readFile(path.join(serverDirectory, '.env'))
  console.log('Building FreelanceFlow for the public preview…')
  const build = childProcess(process.execPath, [path.join(clientDirectory, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], { cwd: clientDirectory })
  build.stdout.pipe(process.stdout)
  build.stderr.pipe(process.stderr)
  await new Promise((resolve, reject) => {
    build.once('error', reject)
    build.once('exit', (code) => code === 0 ? resolve() : reject(Error('Client build failed.')))
  })

  const executable = await tunnelExecutable()
  const port = await freePort()
  const tunnel = childProcess(executable, ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', `http://127.0.0.1:${port}`])
  const publicUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Cloudflare did not provide a public URL within 60 seconds.')), 60000)
    let output = ''
    const collect = (chunk) => {
      output = (output + String(chunk)).slice(-16000)
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)
      if (match) { clearTimeout(timer); resolve(match[0]) }
    }
    tunnel.stdout.on('data', collect)
    tunnel.stderr.on('data', collect)
    tunnel.once('error', (error) => { clearTimeout(timer); reject(error) })
    tunnel.once('exit', () => { clearTimeout(timer); reject(Error('The Cloudflare tunnel stopped before providing a URL.')) })
  })

  const api = childProcess(process.execPath, [path.join(serverDirectory, 'server.js')], {
    cwd: serverDirectory,
    env: {
      ...process.env, NODE_ENV: 'production', SERVE_CLIENT: 'true', PORT: String(port),
      CLIENT_URL: publicUrl, SESSION_SECRET: randomBytes(48).toString('hex'),
    },
  })
  api.stderr.pipe(process.stderr)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('The preview API did not start. Check that MongoDB is running.')), 30000)
    api.stdout.on('data', (chunk) => {
      if (String(chunk).includes(`Server running at http://127.0.0.1:${port}`)) { clearTimeout(timer); resolve() }
    })
    api.once('error', (error) => { clearTimeout(timer); reject(error) })
    api.once('exit', () => { clearTimeout(timer); reject(Error('The preview API stopped during startup.')) })
  })
  console.log(`\nFreelanceFlow public preview: ${publicUrl}`)
  console.log(`Local preview listener: http://127.0.0.1:${port}`)
  console.log('Uses your existing local accounts and project data. Sign-in and project permissions remain required.')
  console.log('Keep this terminal and computer running. Press Ctrl+C here to stop public access.')
  for (const child of [api, tunnel]) child.once('exit', () => { if (!stopping) stop(1) })
  tunnel.once('error', () => stop(1))
  api.once('error', () => stop(1))
} catch (error) {
  // Never log environment variables, credentials, or database connection strings.
  console.error('Unable to start public preview:', error.code || error.message)
  stop(1)
}
