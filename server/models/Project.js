import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  name: { type: String, trim: true, required: true, minlength: 2, maxlength: 120 },
  client: { type: String, trim: true, required: true, minlength: 2, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  collaborationStatus: { type: String, enum: ['none', 'pending', 'accepted', 'declined'], default: 'none' },
  invitationHash: { type: String, match: /^[a-f0-9]{64}$/, select: false },
  invitationExpiresAt: { type: Date, default: null },
  clientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  clientDisplayName: { type: String, maxlength: 80, default: '' },
  clientAcceptedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'review', 'completed'], default: 'active', required: true },
}, { timestamps: true, strict: 'throw', optimisticConcurrency: true })

projectSchema.index({ owner: 1, dueDate: 1, _id: 1 })
projectSchema.index({ owner: 1, status: 1 })

projectSchema.index({ invitationHash: 1 }, { unique: true, sparse: true })
projectSchema.index({ clientUser: 1, collaborationStatus: 1, dueDate: 1, _id: 1 })

export default mongoose.models.Project ?? mongoose.model('Project', projectSchema)
