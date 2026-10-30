import mongoose from 'mongoose'
const line = new mongoose.Schema(
  {
    description: { type: String, required: true, maxlength: 240 },
    quantityUnits: { type: Number, required: true },
    unitPriceCents: { type: Number, required: true },
    amountCents: { type: Number, required: true },
  },
  { _id: false, strict: 'throw' },
)
const schema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true, maxlength: 80 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      immutable: true,
    },
    projectName: { type: String, required: true, maxlength: 120 },
    number: { type: String, required: true, unique: true, immutable: true },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'void'], default: 'draft' },
    currency: { type: String, enum: ['USD', 'LKR'], default: 'USD' },
    senderName: { type: String, required: true, maxlength: 120 },
    senderDetails: { type: String, maxlength: 1000, default: '' },
    billToName: { type: String, required: true, maxlength: 120 },
    billToDetails: { type: String, maxlength: 1000, default: '' },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    items: { type: [line], required: true },
    subtotalCents: { type: Number, required: true },
    discountCents: { type: Number, required: true },
    taxBasisPoints: { type: Number, required: true },
    taxCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    notes: { type: String, maxlength: 2000, default: '' },
    sentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: 'throw' },
)
schema.index({ owner: 1, createdAt: -1, _id: -1 })
schema.index({ recipient: 1, status: 1, createdAt: -1 })
export default mongoose.models.Invoice ?? mongoose.model('Invoice', schema)
