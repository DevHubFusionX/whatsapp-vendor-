const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const BuyerInteraction = require('../models/BuyerInteraction');
const buyerAuth = require('../middleware/buyerAuth');
const { sendOTPEmail } = require('../services/emailService');

const router = express.Router();

// Get all vendors for buyer home page (public)
router.get('/vendors', async (req, res) => {
  try {
    const { location, category, search } = req.query;
    
    let query = { role: 'vendor', isVerified: true };
    
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const vendors = await User.find(query)
      .select('name businessName logo about catalogId phone')
      .limit(20);
    
    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products for buyer browsing (public)
router.get('/products', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort = 'newest', vendor } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (category) {
      query.category = category;
    }
    
    if (vendor) {
      query.vendor = vendor;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    let sortQuery = {};
    switch (sort) {
      case 'price-low':
        sortQuery = { price: 1 };
        break;
      case 'price-high':
        sortQuery = { price: -1 };
        break;
      case 'popular':
        sortQuery = { views: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }
    
    const products = await Product.find(query)
      .populate('vendor', 'name businessName phone')
      .sort(sortQuery)
      .limit(50);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured products (public)
router.get('/products/featured', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, featured: true })
      .populate('vendor', 'name businessName phone')
      .sort({ views: -1 })
      .limit(10);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product by ID (public)
router.get('/products/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('vendor', 'name businessName phone logo about');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Increment view count
    product.views = (product.views || 0) + 1;
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order from buyer (requires authentication)
router.post('/orders', buyerAuth, async (req, res) => {
  try {
    const { vendorId, items, total, deliveryAddress, notes } = req.body;
    
    const order = new Order({
      vendor: vendorId,
      buyerName: req.buyer.name,
      buyerPhone: req.buyer.phone || '',
      buyerEmail: req.buyer.email,
      items,
      total,
      deliveryAddress,
      notes
    });
    
    await order.save();
    
    res.status(201).json({ 
      message: 'Order created successfully',
      orderId: order._id 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Track order by order ID or get all buyer's orders (requires authentication)
router.post('/track-order', buyerAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    let query = { buyerEmail: req.buyer.email };
    if (orderId) {
      query._id = orderId;
    }
    
    const orders = await Order.find(query)
      .populate('vendor', 'businessName phone')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check authentication status (optional auth)
router.get('/auth-check', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ authenticated: false });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'buyer') {
      return res.json({ authenticated: false });
    }
    

    const buyer = await User.findById(decoded.userId).select('-password');
    
    if (!buyer) {
      return res.json({ authenticated: false });
    }

    res.json({ authenticated: true, buyer });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Get buyer profile (requires authentication)
router.get('/profile', buyerAuth, async (req, res) => {
  res.json({
    buyer: {
      _id: req.buyer._id,
      name: req.buyer.name,
      email: req.buyer.email,
      phone: req.buyer.phone,
      address: req.buyer.address
    }
  });
});

// Track product interest (requires authentication)
router.post('/track-interest', buyerAuth, async (req, res) => {
  try {
    const { productId, buyerPhone } = req.body;
    
    // This could be used for analytics or follow-up
    // For now, just acknowledge the tracking
    
    res.json({ message: 'Interest tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Log buyer interactions (requires authentication)
router.post('/interactions', buyerAuth, async (req, res) => {
  try {
    const { vendorId, productId, action } = req.body;
    
    const interaction = new BuyerInteraction({
      buyerId: req.buyer._id,
      vendorId,
      productId,
      action
    });

    await interaction.save();
    
    res.status(201).json({ message: 'Interaction logged successfully' });
  } catch (error) {
    console.error('Log interaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const buyer = await User.findOne({ email, role: 'buyer' });
    if (!buyer) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and expiration (10 minutes)
    buyer.resetOTP = otp;
    buyer.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await buyer.save();
    
    // Send OTP email
    await sendOTPEmail(buyer.email, otp, buyer.name);
    
    res.json({ message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const buyer = await User.findOne({ 
      email,
      role: 'buyer',
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });
    
    if (!buyer) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const buyer = await User.findOne({ 
      email,
      role: 'buyer',
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });
    
    if (!buyer) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    buyer.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP fields
    buyer.resetOTP = undefined;
    buyer.resetOTPExpires = undefined;
    
    await buyer.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;