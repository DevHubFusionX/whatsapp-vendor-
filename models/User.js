const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['vendor'],
    default: 'vendor',
    required: true
  },
  // Vendor fields
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String
  },
  about: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false // Vendors need email verification
  },
  catalogId: {
    type: String,
    unique: true,
    sparse: true
  },
  // OTP fields for password reset
  resetOTP: {
    type: String
  },
  resetOTPExpires: {
    type: Date
  },
  // Email verification OTP
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate catalog ID before saving
userSchema.pre('save', function(next) {
  if (!this.catalogId) {
    this.catalogId = this._id.toString();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);