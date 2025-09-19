const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Buyer = require('../models/Buyer');
const { sendOTPEmail } = require('../services/emailService');

const router = express.Router();

// Vendor Registration
router.post('/vendor/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phoneNumber').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('businessName').trim().isLength({ min: 2 }).withMessage('Business name required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phoneNumber, businessName, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const vendor = new User({
      name,
      email,
      phone: phoneNumber,
      businessName,
      password: hashedPassword,
      role: 'vendor',
      otp,
      otpExpiry,
      isVerified: false
    });

    await vendor.save();
    await sendOTPEmail(email, otp, name);

    res.json({ 
      message: 'Registration successful. Please check your email for verification code.',
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Buyer Registration
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

    const { name, email, password, phone, address } = req.body;
    
    // Check if email exists in either Buyer or User (vendor) collections
    const existingBuyer = await Buyer.findOne({ email });
    const existingVendor = await User.findOne({ email });
    
    if (existingBuyer || existingVendor) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const buyer = new Buyer({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || ''
    });

    await buyer.save();

    const token = jwt.sign({ 
      userId: buyer._id, 
      email: buyer.email, 
      role: 'buyer' 
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        _id: buyer._id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        address: buyer.address,
        profileCompletion: buyer.profileCompletion,
        role: 'buyer'
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
    console.log('Buyer login request:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    
    const buyer = await Buyer.findOne({ email });
    if (!buyer) {
      console.log('Buyer not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, buyer.password);
    if (!isMatch) {
      console.log('Password mismatch for buyer:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      userId: buyer._id, 
      email: buyer.email, 
      role: 'buyer' 
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    console.log('Buyer login successful:', email);
    res.json({
      token,
      user: {
        _id: buyer._id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        address: buyer.address,
        profileCompletion: buyer.profileCompletion,
        role: 'buyer'
      }
    });
  } catch (error) {
    console.error('Buyer login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor Login
router.post('/vendor/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    
    const vendor = await User.findOne({ email, role: 'vendor' });
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

    const token = jwt.sign({ 
      userId: vendor._id, 
      email: vendor.email, 
      role: 'vendor' 
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        phone: vendor.phone,
        catalogId: vendor.catalogId,
        role: 'vendor'
      }
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP (Vendor)
router.post('/vendor/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    const vendor = await User.findOne({ email, role: 'vendor' });
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor not found' });
    }

    if (vendor.isVerified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    
    vendor.otp = otp;
    vendor.otpExpiry = otpExpiry;
    await vendor.save();
    
    await sendOTPEmail(email, otp, vendor.name);
    
    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Verify OTP (Vendor)
router.post('/vendor/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    
    const vendor = await User.findOne({ email, role: 'vendor' });
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

    vendor.isVerified = true;
    vendor.otp = null;
    vendor.otpExpiry = null;
    await vendor.save();

    const token = jwt.sign({ 
      userId: vendor._id,
      email: vendor.email,
      role: 'vendor'
    }, process.env.JWT_SECRET);
    
    res.json({
      token,
      user: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        phone: vendor.phone,
        catalogId: vendor.catalogId,
        role: 'vendor'
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    if (user.role === 'vendor') {
      userData.businessName = user.businessName;
      userData.phone = user.phone;
      userData.logo = user.logo;
      userData.about = user.about;
      userData.catalogId = user.catalogId;
    }

    res.json({ user: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Buyer Forgot Password
router.post('/buyer/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const buyer = await Buyer.findOne({ email });
    if (!buyer) {
      return res.status(404).json({ message: 'No buyer account found with this email address' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    buyer.resetOTP = otp;
    buyer.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await buyer.save();
    
    await sendOTPEmail(buyer.email, otp, buyer.name);
    
    res.json({ message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Buyer forgot password error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Vendor Forgot Password
router.post('/vendor/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const vendor = await User.findOne({ email, role: 'vendor' });
    if (!vendor) {
      return res.status(404).json({ message: 'No vendor account found with this email address' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    vendor.resetOTP = otp;
    vendor.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await vendor.save();
    
    await sendOTPEmail(vendor.email, otp, vendor.name);
    
    res.json({ message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Vendor forgot password error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Buyer Verify Reset OTP
router.post('/buyer/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const buyer = await Buyer.findOne({ 
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });
    
    if (!buyer) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Buyer verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor Verify Reset OTP
router.post('/vendor/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const vendor = await User.findOne({ 
      email,
      role: 'vendor',
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });
    
    if (!vendor) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Vendor verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Buyer Reset Password
router.post('/buyer/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const buyer = await Buyer.findOne({ 
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });
    
    if (!buyer) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    const salt = await bcrypt.genSalt(10);
    buyer.password = await bcrypt.hash(newPassword, salt);
    buyer.resetOTP = undefined;
    buyer.resetOTPExpires = undefined;
    
    await buyer.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Buyer reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor Reset Password
router.post('/vendor/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const vendor = await User.findOne({ 
      email,
      role: 'vendor',
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });
    
    if (!vendor) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    const salt = await bcrypt.genSalt(10);
    vendor.password = await bcrypt.hash(newPassword, salt);
    vendor.resetOTP = undefined;
    vendor.resetOTPExpires = undefined;
    
    await vendor.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Vendor reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;