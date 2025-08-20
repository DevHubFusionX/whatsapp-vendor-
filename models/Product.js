const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  category: {
    type: String,
    default: 'general'
  },
  paymentLink: {
    type: String,
    default: null
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    default: 'general'
  },
  stock: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);