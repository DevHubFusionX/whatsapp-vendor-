const mongoose = require('mongoose');

const buyerInteractionSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  action: {
    type: String,
    required: true,
    enum: ['MessageVendor', 'ViewProduct', 'AddToCart', 'PlaceOrder']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BuyerInteraction', buyerInteractionSchema);