const express = require('express');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// Get vendor's orders
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ vendor: req.vendor._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent orders (last 10)
router.get('/recent', auth, async (req, res) => {
  try {
    const orders = await Order.find({ vendor: req.vendor._id })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new order (from buyer)
router.post('/', async (req, res) => {
  try {
    const { vendorId, buyerName, buyerPhone, buyerEmail, items, total, deliveryAddress, notes } = req.body;
    
    const order = new Order({
      vendor: vendorId,
      buyerName,
      buyerPhone,
      buyerEmail,
      items,
      total,
      deliveryAddress,
      notes
    });
    
    await order.save();
    await order.populate('items.product');
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status
router.put('/:orderId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, vendor: req.vendor._id },
      { status },
      { new: true }
    ).populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
router.get('/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      vendor: req.vendor._id 
    }).populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;