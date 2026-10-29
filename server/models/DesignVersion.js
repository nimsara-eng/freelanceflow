import mongoose from 'mongoose'
import { MAX_COMMENTS, MAX_REPLIES, MAX_IMAGE_BYTES } from '../utils/prototypes.js'

const message = {
  text: { type: String, required: true, maxlength: 1000 },
  authorName: { type: String, required: true, maxlength: 80 },
  authorRole: { type: String, enum: ['freelancer', 'client'], required: true },
  authorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}
const replySchema = new mongoose.Schema(message, { strict: 'throw' })
const commentSchema = new mongoose.Schema({
  ...message,
  x: { type: Number, required: true, min: 0, max: 1 },
  y: { type: Number, required: true, min: 0, max: 1 },
  resolved: { type: Boolean, default: false },
  replies: { type: [replySchema], default: () => [], validate: (items) => items.length <= MAX_REPLIES },
}, { strict: 'throw' })

export const designVersionSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 80 },
  width: { type: Number, required: true, min: 1, max: 16000000 },
  height: { type: Number, required: true, min: 1, max: 16000000 },
  data: { type: Buffer, required: true, validate: (value) => {
    const length = value?.length ?? value?.buffer?.length
    return length > 0 && length <= MAX_IMAGE_BYTES
  } },
  sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  comments: { type: [commentSchema], default: () => [], validate: (items) => items.length <= MAX_COMMENTS },
}, { strict: 'throw' })
