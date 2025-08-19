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
    enum: ['buyer', 'vendor'],
    required: true
  },
  // Common fields
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Vendor-specific fields
  businessName: {
    type: String,
    required: function() { return this.role === 'vendor'; }
  },
  logo: {
    type: String
  },
  about: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: function() { return this.role === 'buyer'; } // Buyers auto-verified, vendors need verification
  },
  catalogId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Buyer-specific fields
  address: {
    type: String,
    trim: true
  },
  // OTP fields for password reset
  resetOTP: {
    type: String
  },
  resetOTPExpires: {
    type: Date
  },
  // Email verification OTP (for vendors)
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate catalog ID for vendors before saving
userSchema.pre('save', function(next) {
  if (this.role === 'vendor' && !this.catalogId) {
    this.catalogId = this._id.toString();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);