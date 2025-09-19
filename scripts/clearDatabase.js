const mongoose = require('mongoose');
const User = require('../models/User');
const Buyer = require('../models/Buyer');
require('dotenv').config();

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const vendorCount = await User.countDocuments();
    const buyerCount = await Buyer.countDocuments();
    
    console.log(`Found ${vendorCount} vendors and ${buyerCount} buyers`);

    await User.deleteMany({});
    await Buyer.deleteMany({});

    console.log('All vendors and buyers cleared from database');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearDatabase();