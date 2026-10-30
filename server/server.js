import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import { rateLimit } from 'express-rate-limit'
import { connectDB } from './config/db.js'
import User from './models/User.js'
import FreelancerProfile from './models/FreelancerProfile.js'
import Asset from './models/Asset.js'
import Notification from './models/Notification.js'
import {ScheduleBlock,TimeEntry} from './models/WorkTime.js'
import workTimeRoutes from './routes/workTime.js'
import Invoice from './models/Invoice.js'
import invoiceRoutes from './routes/invoices.js'
import requestRoutes from './routes/workRequests.js'
import clientRoutes from './routes/clients.js'
import notificationRoutes from './routes/notifications.js'
import Project from './models/Project.js'
import reviewRoutes from './routes/reviews.js'
import collaborationRoutes from './routes/collaboration.js'
import projectRoutes from './routes/projects.js'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import freelancerRoutes from './routes/freelancers.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'
import { configuredOrigins, production, protectWrites, sessionCookie, sessionLifetime, sessionName } from './config/security.js'
import { httpError } from './utils/httpError.js'

const secret = process.env.SESSION_SECRET
if (!secret || secret.length < 64) throw new Error('Configure a random SESSION_SECRET of at least 64 characters in server/.env.')
const port = Number(process.env.PORT || 5000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server PORT.')
const origins = configuredOrigins()

await connectDB()
await Promise.all([User.init(), FreelancerProfile.init(), Asset.init(), Project.init(), Notification.init(), ScheduleBlock.init(), TimeEntry.init(), Invoice.init()])

const app = express()
app.disable('x-powered-by')
if (production) app.set('trust proxy', 'loopback')
app.use(helmet())
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || origins.has(origin)) return callback(null, true)
    callback(httpError(403, 'Origin is not allowed.'))
  },
}))
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many requests. Try again later.' } }))
app.use(express.json({ limit: '32kb' }))
const store = MongoStore.create({ clientPromise: Promise.resolve(mongoose.connection.getClient()), dbName: mongoose.connection.name, collectionName: 'sessions', ttl: sessionLifetime / 1000 })
store.on('error', () => console.error('Session store unavailable.'))
app.use(session({
  name: sessionName, secret, store, resave: false, saveUninitialized: false,
  cookie: { ...sessionCookie, maxAge: sessionLifetime },
}))
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
app.use('/api', protectWrites)
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'FreelanceFlow backend is running' }))
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/freelancers', freelancerRoutes)
app.use('/api/work-requests', requestRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/time', workTimeRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/collaboration', collaborationRoutes)
app.use(notFound)
app.use(errorHandler)

const server = app.listen(port, '127.0.0.1', () => console.log(`Server running at http://127.0.0.1:${port}`))
server.on('error', (error) => { console.error('Server could not listen:', error.code); process.exitCode = 1 })
