const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { uploadImage } = require('../utils/cloudinary');

const router = express.Router();

// Get public vendor profile
router.get('/:catalogId', async (req, res) => {
  try {
    console.log('Looking for vendor with ID:', req.params.catalogId);
    const vendor = await User.findOne({ 
      $or: [
        { _id: req.params.catalogId },
        { catalogId: req.params.catalogId }
      ],
      role: 'vendor' 
    });
    console.log('Found vendor:', vendor ? vendor.businessName : 'Not found');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const products = await Product.find({ vendor: vendor._id })
      .sort({ createdAt: -1 });
    
    console.log('Found products:', products.length);

    res.json({
      vendor: {
        id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName,
        phoneNumber: vendor.phone,
        logo: vendor.logo,
        about: vendor.about,
        catalogId: vendor.catalogId
      },
      products
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update vendor profile
router.put('/profile', auth, [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('businessName').trim().isLength({ min: 1 }).withMessage('Business name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, businessName, about, logo } = req.body;
    
    let logoUrl = req.vendor.logo;
    if (logo && logo !== req.vendor.logo) {
      logoUrl = await uploadImage(logo, 'vendor-logos');
    }

    req.vendor.name = name;
    req.vendor.businessName = businessName;
    req.vendor.about = about || '';
    req.vendor.logo = logoUrl;

    await req.vendor.save();

    res.json({
      vendor: {
        id: req.vendor._id,
        name: req.vendor.name,
        businessName: req.vendor.businessName,
        phoneNumber: req.vendor.phone,
        logo: req.vendor.logo,
        about: req.vendor.about,
        catalogId: req.vendor.catalogId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;