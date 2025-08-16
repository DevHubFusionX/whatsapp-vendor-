const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get enhanced dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    // Get today's sales
    const todayOrders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: today },
      status: { $ne: 'cancelled' }
    });
    
    const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    
    // Get week's sales
    const weekOrders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: weekAgo },
      status: { $ne: 'cancelled' }
    });
    
    const weekSales = weekOrders.reduce((sum, order) => sum + order.total, 0);
    
    // Get month's sales
    const monthOrders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: monthAgo },
      status: { $ne: 'cancelled' }
    });
    
    const monthSales = monthOrders.reduce((sum, order) => sum + order.total, 0);
    
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
    
    // Calculate conversion rate (orders vs product views)
    const totalOrders = await Order.countDocuments({ vendor: vendorId });
    const products = await Product.find({ vendor: vendorId, isActive: true });
    const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
    const conversionRate = totalViews > 0 ? Math.round((totalOrders / totalViews) * 100) : 0;
    
    res.json({
      todaySales,
      weekSales,
      monthSales,
      pendingOrders,
      totalProducts,
      totalCustomers: uniqueCustomers.length,
      conversionRate
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }
    
    const orders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: startDate },
      status: { $ne: 'cancelled' }
    }).populate('items.product');
    
    // Group sales by day
    const salesByDay = {};
    orders.forEach(order => {
      const day = order.createdAt.toISOString().split('T')[0];
      salesByDay[day] = (salesByDay[day] || 0) + order.total;
    });
    
    // Top products
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.product._id.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            product: item.product,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.quantity * item.price;
      });
    });
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    res.json({
      salesByDay,
      topProducts,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      totalOrders: orders.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get low stock alerts
router.get('/alerts', auth, async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    
    // Get products with low stock (less than 5)
    const lowStockProducts = await Product.find({
      vendor: vendorId,
      isActive: true,
      stock: { $lt: 5 }
    });
    
    // Get old pending orders (more than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldPendingOrders = await Order.find({
      vendor: vendorId,
      status: 'pending',
      createdAt: { $lt: oneDayAgo }
    });
    
    const alerts = [];
    
    if (lowStockProducts.length > 0) {
      alerts.push({
        type: 'stock',
        message: `${lowStockProducts.length} products are running low on stock`,
        count: lowStockProducts.length,
        products: lowStockProducts.map(p => ({ name: p.name, stock: p.stock || 0 }))
      });
    }
    
    if (oldPendingOrders.length > 0) {
      alerts.push({
        type: 'orders',
        message: `${oldPendingOrders.length} orders have been pending for over 24 hours`,
        count: oldPendingOrders.length
      });
    }
    
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;