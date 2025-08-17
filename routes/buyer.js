const express = require('express');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const BuyerInteraction = require('../models/BuyerInteraction');
const buyerAuth = require('../middleware/buyerAuth');

const router = express.Router();

// Get all vendors for buyer home page
router.get('/vendors', async (req, res) => {
  try {
    const { location, category, search } = req.query;
    
    let query = { isVerified: true };
    
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const vendors = await Vendor.find(query)
      .select('name businessName logo about catalogId phoneNumber')
      .limit(20);
    
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products for buyer browsing
router.get('/products', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort = 'newest' } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (category) {
      query.category = category;
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
      .populate('vendor', 'name businessName phoneNumber')
      .sort(sortQuery)
      .limit(50);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured products
router.get('/products/featured', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, featured: true })
      .populate('vendor', 'name businessName phoneNumber')
      .sort({ views: -1 })
      .limit(10);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product by ID
router.get('/products/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('vendor', 'name businessName phoneNumber logo about');
    
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
      .populate('vendor', 'businessName phoneNumber')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Track product interest
router.post('/track-interest', async (req, res) => {
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

module.exports = router;