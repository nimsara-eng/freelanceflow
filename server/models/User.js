import mongoose from 'mongoose'

const { Schema } = mongoose

const addressSchema = new Schema(
  {
    line1: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    line2: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    region: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
  },
  { _id: false },
)

const userSchema = new Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: /^scrypt\$\d+\$\d+\$\d+\$[a-f0-9]{32}\$[a-f0-9]{128}$/,
    },

    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
      validate: Number.isInteger,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    roles: {
      type: [{
        type: String,
        enum: ['client', 'freelancer'],
      }],
      default: () => ['client'],
      immutable: true,
      validate: {
        validator(value) {
          return (
            value.includes('client') &&
            new Set(value).size === value.length
          )
        },
        message: 'Every account must include client access.',
      },
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    avatarAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },

    address: {
      type: addressSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    strict: 'throw',
    toJSON: {
      transform(_document, result) {
        delete result.passwordHash
        delete result.passwordChangedAt
        delete result.sessionVersion
        delete result.__v
        return result
      },
    },
  },
)

export default mongoose.models.User ??
  mongoose.model('User', userSchema)