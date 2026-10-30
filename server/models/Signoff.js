import mongoose from 'mongoose'
const fields = {
  designId: { type: mongoose.Schema.Types.ObjectId, required: true },
  designTitle: { type: String, required: true, maxlength: 80 },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  connectionAt: { type: Date, required: true },
  clientName: { type: String, required: true, maxlength: 80 },
  submittedByName: { type: String, required: true, maxlength: 80 },
  submittedAt: { type: Date, default: Date.now },
  note: { type: String, maxlength: 2000, default: '' },
  respondedByName: { type: String, maxlength: 80, default: '' },
  respondedAt: { type: Date, default: null },
  message: { type: String, maxlength: 2000, default: '' },
}
export const approvalSchema = new mongoose.Schema(
  {
    ...fields,
    status: {
      type: String,
      enum: ['pending', 'approved', 'changes_requested', 'withdrawn'],
      default: 'pending',
    },
  },
  { strict: 'throw' },
)
export const deliverySchema = new mongoose.Schema(
  {
    ...fields,
    approvalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'changes_requested', 'withdrawn'],
      default: 'pending',
    },
  },
  { strict: 'throw' },
)
