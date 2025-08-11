const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's sales
    const todayOrders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: today },
      status: { $ne: 'cancelled' }
    });
    
    const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    
    // Get pending orders count
    const pendingOrders = await Order.countDocuments({
      vendor: vendorId,
      status: 'pending'
    });
    
    // Get total products
    const totalProducts = await Product.countDocuments({
      vendor: vendorId,
      isActive: true
    });
    
    // Get unique customers count
    const uniqueCustomers = await Order.distinct('buyerPhone', {
      vendor: vendorId
    });
    
    res.json({
      todaySales,
      pendingOrders,
      totalProducts,
      totalCustomers: uniqueCustomers.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;