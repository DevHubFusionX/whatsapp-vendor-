const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: null
  },
  about: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  catalogId: {
    type: String,
    unique: true
  },
  resetOTP: {
    type: String
  },
  resetOTPExpires: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate catalog ID before saving
vendorSchema.pre('save', function(next) {
  if (!this.catalogId) {
    this.catalogId = this._id.toString();
  }
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);