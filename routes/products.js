const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { uploadImage } = require('../utils/cloudinary');

const router = express.Router();

// Get vendor's products
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.vendor._id, isActive: true })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add product
router.post('/', auth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, description, image, category } = req.body;
    
    let imageUrl = null;
    if (image) {
      imageUrl = await uploadImage(image);
    }

    const product = new Product({
      name,
      price: parseFloat(price),
      description: description || '',
      image: imageUrl,
      category: category || 'general',
      vendor: req.vendor._id
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', auth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, description, image, category } = req.body;
    
    const product = await Product.findOne({ 
      _id: req.params.id, 
      vendor: req.vendor._id 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let imageUrl = product.image;
    if (image && image !== product.image) {
      imageUrl = await uploadImage(image);
    }

    product.name = name;
    product.price = parseFloat(price);
    product.description = description || '';
    product.image = imageUrl;
    product.category = category || 'general';

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      vendor: req.vendor._id 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isActive = false;
    await product.save();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;