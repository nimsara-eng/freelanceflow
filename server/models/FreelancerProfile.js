import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'

const { Schema } = mongoose

function httpsLink(allowedDomain) {
  return {
    type: String,
    trim: true,
    maxlength: 2048,
    default: '',
    validate: {
      validator(value) {
        if (!value) {
          return true
        }

        try {
          const url = new URL(value)

          if (
            url.protocol !== 'https:' ||
            url.username ||
            url.password
          ) {
            return false
          }

          if (!allowedDomain) {
            return true
          }

          return (
            url.hostname === allowedDomain ||
            url.hostname.endsWith(`.${allowedDomain}`)
          )
        } catch {
          return false
        }
      },
      message: 'Enter a valid HTTPS profile link.',
    },
  }
}

const freelancerProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true,
    },

    freelancerId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () =>
        `FF-${randomBytes(6).toString('hex').toUpperCase()}`,
      match: /^FF-[A-F0-9]{12}$/,
    },

    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },

    skills: {
      type: [{
        type: String,
        trim: true,
        maxlength: 50,
      }],
      default: [],
      validate: {
        validator: (value) => value.length <= 20,
        message: 'A maximum of 20 skills is allowed.',
      },
    },

    services: {
      type: [{
        type: String,
        trim: true,
        maxlength: 160,
      }],
      default: [],
      validate: {
        validator: (value) => value.length <= 10,
        message: 'A maximum of 10 services is allowed.',
      },
    },

    githubUrl: httpsLink('github.com'),
    linkedinUrl: httpsLink('linkedin.com'),
    portfolioUrl: httpsLink(),

    publicLocation: {
      city: {
        type: String,
        trim: true,
        maxlength: 80,
        default: '',
      },
      country: {
        type: String,
        trim: true,
        maxlength: 80,
        default: '',
      },
    },

    resumeAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },

    showResumeOnProfile: {
      type: Boolean,
      default: false,
    },

    visibility: {
      type: String,
      enum: ['private', 'published'],
      default: 'private',
    },
  },
  {
    timestamps: true,
    strict: 'throw',
  },
)

export default mongoose.models.FreelancerProfile ??
  mongoose.model('FreelancerProfile', freelancerProfileSchema)