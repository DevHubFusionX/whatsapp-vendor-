const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createTestVendor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if vendor already exists
    const existingVendor = await User.findOne({ email: 'vendor1@example.com' });
    if (existingVendor) {
      console.log('Vendor already exists, updating password...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      existingVendor.password = hashedPassword;
      existingVendor.isVerified = true; // Skip email verification for testing
      await existingVendor.save();
      console.log('Vendor password updated and verified!');
    } else {
      console.log('Creating new test vendor...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const testVendor = new User({
        name: 'Test Vendor',
        email: 'vendor1@example.com',
        phone: '1234567890',
        businessName: 'Test Business',
        password: hashedPassword,
        role: 'vendor',
        isVerified: true // Skip email verification for testing
      });

      await testVendor.save();
      console.log('Test vendor created successfully!');
    }

    console.log('Test vendor details:');
    console.log('Email: vendor1@example.com');
    console.log('Password: password123');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestVendor();