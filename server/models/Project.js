import mongoose from 'mongoose'
import { designVersionSchema } from './DesignVersion.js'
import { MAX_DESIGNS } from '../utils/prototypes.js'
import { MAX_TASKS, taskStatuses } from '../utils/tasks.js'

const taskSchema = new mongoose.Schema({
  title: { type: String, trim: true, required: true, minlength: 2, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  dueDate: { type: String, default: '', match: /^(?:|\d{4}-\d{2}-\d{2})$/ },
  status: { type: String, enum: taskStatuses, default: 'todo', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: 'throw' })


const workRequestSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending','accepted','declined','withdrawn'], required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, required: true, maxlength: 80 },
  freelancerName: { type: String, required: true, maxlength: 80 },
  currency: { type: String, enum: ['USD','LKR'], default: 'USD' },
  budgetCents: { type: Number, min: 0, max: 100000000, required: true, validate: Number.isSafeInteger },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
}, { _id: false, strict: 'throw' })

const projectSchema = new mongoose.Schema({
  workRequest: { type: workRequestSchema, default: null, select: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  name: { type: String, trim: true, required: true, minlength: 2, maxlength: 120 },
  client: { type: String, trim: true, required: true, minlength: 2, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  // ponytail: five 2 MB images plus bounded feedback stay below MongoDB's 16 MB document ceiling.
  // Use object storage and a version collection when larger projects need more retained designs.
  designVersions: { type: [designVersionSchema], select: false, default: () => [], validate: (items) => items.length <= MAX_DESIGNS },
  tasks: { type: [taskSchema], default: () => [], validate: { validator: (tasks) => tasks.length <= MAX_TASKS, message: 'Too many tasks in this project.' } },
  collaborationStatus: { type: String, enum: ['none', 'pending', 'accepted', 'declined'], default: 'none' },
  invitationHash: { type: String, match: /^[a-f0-9]{64}$/, select: false },
  invitationExpiresAt: { type: Date, default: null },
  clientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  clientDisplayName: { type: String, maxlength: 80, default: '' },
  clientAcceptedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'review', 'completed'], default: 'active', required: true },
}, { timestamps: true, strict: 'throw', optimisticConcurrency: true })

projectSchema.index({ owner: 1, 'workRequest.client': 1 }, { unique: true, partialFilterExpression: { 'workRequest.status': 'pending' } })
projectSchema.index({ 'workRequest.client': 1, 'workRequest.createdAt': -1 })
projectSchema.index({ owner: 1, dueDate: 1, _id: 1 })
projectSchema.index({ owner: 1, status: 1 })

projectSchema.index({ invitationHash: 1 }, { unique: true, sparse: true })
projectSchema.index({ clientUser: 1, collaborationStatus: 1, dueDate: 1, _id: 1 })

export default mongoose.models.Project ?? mongoose.model('Project', projectSchema)
