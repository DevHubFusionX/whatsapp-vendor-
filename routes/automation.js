const express = require('express');
const Customer = require('../models/Customer');
const AutoPost = require('../models/AutoPost');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Track customer interest
router.post('/track-interest', async (req, res) => {
  try {
    const { phoneNumber, productId, vendorId } = req.body;
    
    let customer = await Customer.findOne({ phoneNumber, vendor: vendorId });
    
    if (!customer) {
      customer = new Customer({
        phoneNumber,
        vendor: vendorId
      });
    }
    
    // Add or update product interest
    const existingInterest = customer.interestedProducts.find(
      p => p.product.toString() === productId
    );
    
    if (existingInterest) {
      existingInterest.timestamp = new Date();
      existingInterest.status = 'interested';
    } else {
      customer.interestedProducts.push({
        product: productId,
        status: 'interested'
      });
    }
    
    customer.lastInteraction = new Date();
    await customer.save();
    
    res.json({ message: 'Interest tracked' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customers for follow-up
router.get('/follow-up-customers', auth, async (req, res) => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const customers = await Customer.find({
      vendor: req.vendor._id,
      lastInteraction: { $gte: twoDaysAgo },
      'interestedProducts.status': 'interested'
    }).populate('interestedProducts.product');
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Setup auto-posting
router.post('/auto-post/setup', auth, async (req, res) => {
  try {
    const { isEnabled, postTime, selectedProducts, postFrequency } = req.body;
    
    let autoPost = await AutoPost.findOne({ vendor: req.vendor._id });
    
    if (!autoPost) {
      autoPost = new AutoPost({ vendor: req.vendor._id });
    }
    
    autoPost.isEnabled = isEnabled;
    autoPost.postTime = postTime;
    autoPost.selectedProducts = selectedProducts;
    autoPost.postFrequency = postFrequency;
    
    await autoPost.save();
    
    res.json(autoPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get auto-post settings
router.get('/auto-post/settings', auth, async (req, res) => {
  try {
    const autoPost = await AutoPost.findOne({ vendor: req.vendor._id })
      .populate('selectedProducts');
    
    res.json(autoPost || { isEnabled: false });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate WhatsApp product card
router.post('/generate-card/:productId', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      vendor: req.vendor._id
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const catalogUrl = `${req.protocol}://${req.get('host')}/catalog/${req.vendor.catalogId}`;
    
    const card = {
      text: `🛍️ *${product.name}*\n\n💰 ₦${product.price.toLocaleString()}\n\n${product.description}\n\n📱 Message me to order!\n${catalogUrl}`,
      image: product.image,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`🛍️ *${product.name}*\n\n💰 ₦${product.price.toLocaleString()}\n\n${product.description}\n\n📱 Message me to order!\n${catalogUrl}`)}`
    };
    
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;