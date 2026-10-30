import mongoose from 'mongoose'

const assetSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  kind: { type: String, enum: ['avatar', 'resume'], required: true, immutable: true },
  contentType: { type: String, enum: ['image/webp', 'application/pdf'], required: true },
  size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  data: { type: Buffer, required: true, select: false, validate(value) { const length = typeof value.length === 'function' ? value.length() : value.length; return Number.isInteger(length) && length > 0 && length <= 5 * 1024 * 1024 } },
}, { timestamps: true, strict: 'throw' })
assetSchema.index({ owner: 1, kind: 1 }, { unique: true })

export default mongoose.models.Asset ?? mongoose.model('Asset', assetSchema)
