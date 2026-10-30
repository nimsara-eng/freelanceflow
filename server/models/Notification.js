import mongoose from 'mongoose'
const schema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventKey: { type: String, required: true, maxlength: 200 },
    title: { type: String, required: true, maxlength: 240 },
    path: { type: String, required: true, maxlength: 240 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, strict: 'throw' },
)
schema.index({ recipient: 1, eventKey: 1 }, { unique: true })
schema.index({ recipient: 1, createdAt: -1, _id: -1 })
export default mongoose.models.Notification ?? mongoose.model('Notification', schema)
