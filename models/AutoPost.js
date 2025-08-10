const mongoose = require('mongoose');

const autoPostSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  postTime: {
    type: String,
    default: '09:00' // 9 AM
  },
  selectedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  lastPosted: {
    type: Date
  },
  postFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AutoPost', autoPostSchema);