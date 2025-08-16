const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Vendor = require('../models/Vendor');
const Buyer = require('../models/Buyer');
const BuyerInteraction = require('../models/BuyerInteraction');
const auth = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/email');

const router = express.Router();

// Register vendor
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phoneNumber').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('businessName').trim().isLength({ min: 2 }).withMessage('Business name required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phoneNumber, businessName, password } = req.body;
    console.log('Registration data:', { name, email, phoneNumber, businessName, password: '***' });
    
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique catalog ID
    const catalogId = new Date().getTime().toString() + Math.random().toString(36).substr(2, 5);
    
    // Create vendor
    const vendor = new Vendor({
      name,
      email,
      phoneNumber,
      businessName,
      password: hashedPassword,
      catalogId,
      otp,
      otpExpiry,
      isVerified: false
    });

    await vendor.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, name);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({ 
      message: 'Registration successful. Please check your email for verification code.',
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor not found' });
    }

    if (vendor.isVerified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    if (!vendor.otp || vendor.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (vendor.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Verify vendor
    vendor.isVerified = true;
    vendor.otp = null;
    vendor.otpExpiry = null;
    await vendor.save();

    // Generate JWT token
    const token = jwt.sign({ vendorId: vendor._id }, process.env.JWT_SECRET);
    
    res.json({
      token,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        phoneNumber: vendor.phoneNumber,
        catalogId: vendor.catalogId
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Resend OTP
router.post('/resend-otp', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const { email } = req.body;
    
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor not found' });
    }

    if (vendor.isVerified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    vendor.otp = otp;
    vendor.otpExpiry = otpExpiry;
    await vendor.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, vendor.name);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({ message: 'New verification code sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!vendor.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ vendorId: vendor._id }, process.env.JWT_SECRET);
    
    res.json({
      token,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        phoneNumber: vendor.phoneNumber,
        catalogId: vendor.catalogId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get current vendor
router.get('/me', auth, async (req, res) => {
  res.json({
    vendor: {
      id: req.vendor._id,
      name: req.vendor.name,
      email: req.vendor.email,
      businessName: req.vendor.businessName,
      phoneNumber: req.vendor.phoneNumber,
      logo: req.vendor.logo,
      about: req.vendor.about,
      catalogId: req.vendor.catalogId
    }
  });
});

// Buyer Signup
router.post('/buyer/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;
    
    const existingBuyer = await Buyer.findOne({ email });
    if (existingBuyer) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const buyer = new Buyer({
      name,
      email,
      password: hashedPassword
    });

    await buyer.save();

    const token = jwt.sign({ buyerId: buyer._id }, process.env.JWT_SECRET);
    
    res.status(201).json({
      token,
      buyer: {
        _id: buyer._id,
        name: buyer.name,
        email: buyer.email
      }
    });
  } catch (error) {
    console.error('Buyer signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Buyer Login
router.post('/buyer/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    
    const buyer = await Buyer.findOne({ email });
    if (!buyer) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, buyer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ buyerId: buyer._id }, process.env.JWT_SECRET);
    
    res.json({
      token,
      buyer: {
        _id: buyer._id,
        name: buyer.name,
        email: buyer.email
      }
    });
  } catch (error) {
    console.error('Buyer login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get buyer profile
router.get('/buyer/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const buyer = await Buyer.findById(decoded.buyerId).select('-password');
    
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    res.json(buyer);
  } catch (error) {
    console.error('Get buyer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;