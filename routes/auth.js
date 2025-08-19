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
        _id: vendor._id,
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





// Buyer Signup
router.post('/signup', [
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

    const token = jwt.sign({ 
      buyerId: buyer._id, 
      email: buyer.email, 
      role: 'buyer' 
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
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

// Buyer Login - Updated to handle both vendor and buyer login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    
    // First try to find buyer
    const buyer = await Buyer.findOne({ email });
    if (buyer) {
      const isMatch = await bcrypt.compare(password, buyer.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign({ 
        buyerId: buyer._id, 
        email: buyer.email, 
        role: 'buyer' 
      }, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      return res.json({
        token,
        buyer: {
          _id: buyer._id,
          name: buyer.name,
          email: buyer.email
        }
      });
    }
    
    // If not buyer, try vendor
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
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        phoneNumber: vendor.phoneNumber,
        catalogId: vendor.catalogId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile (buyer or vendor)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a buyer token
    if (decoded.buyerId) {
      const buyer = await Buyer.findById(decoded.buyerId).select('-password');
      if (!buyer) {
        return res.status(404).json({ message: 'Buyer not found' });
      }
      return res.json({ buyer });
    }
    
    // Check if it's a vendor token
    if (decoded.vendorId) {
      const vendor = await Vendor.findById(decoded.vendorId);
      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      return res.json({
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          businessName: vendor.businessName,
          phoneNumber: vendor.phoneNumber,
          logo: vendor.logo,
          about: vendor.about,
          catalogId: vendor.catalogId
        }
      });
    }
    
    return res.status(401).json({ message: 'Invalid token' });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor Forgot Password
router.post('/vendor/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ message: 'No account found with this email address' });
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

// Vendor Verify OTP
router.post('/vendor/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const vendor = await Vendor.findOne({ 
      email,
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

// Vendor Reset Password
router.post('/vendor/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const vendor = await Vendor.findOne({ 
      email,
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

// Buyer Forgot Password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const { email } = req.body;
    
    const buyer = await Buyer.findOne({ email });
    if (!buyer) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const resetToken = jwt.sign({ buyerId: buyer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // In a real app, send email with reset link
    // For now, just return the token
    res.json({ 
      message: 'Password reset link sent to your email',
      resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const buyer = await Buyer.findById(decoded.buyerId);
    
    if (!buyer) {
      return res.status(404).json({ message: 'Invalid reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    buyer.password = hashedPassword;
    await buyer.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ message: 'Invalid or expired reset token' });
  }
});

// Logout (optional - frontend handles token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;