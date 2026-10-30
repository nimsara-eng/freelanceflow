import mongoose from 'mongoose'
const fields = {
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true, maxlength: 120 },
  note: { type: String, maxlength: 500, default: '' },
  start: { type: Date, required: true },
  end: { type: Date, default: null },
}
const schedule = new mongoose.Schema(
  { ...fields, slots: { type: [Number], required: true, select: false } },
  { timestamps: true, strict: 'throw' },
)
// Unique occupied quarter-hours also protect simultaneous schedule writes on standalone MongoDB.
schedule.index({ owner: 1, slots: 1 }, { unique: true })
schedule.index({ owner: 1, start: 1 })
const entry = new mongoose.Schema(
  { ...fields, source: { type: String, enum: ['timer', 'manual'], required: true } },
  { timestamps: true, strict: 'throw' },
)
entry.index({ owner: 1 }, { unique: true, partialFilterExpression: { end: null } })
entry.index({ owner: 1, start: 1 })
export const ScheduleBlock =
  mongoose.models.ScheduleBlock ?? mongoose.model('ScheduleBlock', schedule)
export const TimeEntry = mongoose.models.TimeEntry ?? mongoose.model('TimeEntry', entry)
