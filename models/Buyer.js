const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: true // Buyers are auto-verified
  },
  // Profile completion tracking
  profileCompletion: {
    type: Number,
    default: 0
  },
  // Order history count
  orderCount: {
    type: Number,
    default: 0
  },
  // OTP fields for password reset
  resetOTP: {
    type: String
  },
  resetOTPExpires: {
    type: Date
  },
  // Preferences
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Calculate profile completion percentage
buyerSchema.methods.calculateProfileCompletion = function() {
  let completion = 0;
  const fields = ['name', 'email', 'phone', 'address'];
  
  fields.forEach(field => {
    if (this[field] && this[field].trim() !== '') {
      completion += 25;
    }
  });
  
  this.profileCompletion = completion;
  return completion;
};

// Update profile completion before saving
buyerSchema.pre('save', function(next) {
  this.calculateProfileCompletion();
  next();
});

module.exports = mongoose.model('Buyer', buyerSchema);