const mongoose = require('mongoose');
require('dotenv').config();

// Old models
const vendorSchema = new mongoose.Schema({
  name: String,
  email: String,
  phoneNumber: String,
  businessName: String,
  password: String,
  catalogId: String,
  logo: String,
  about: String,
  isVerified: Boolean,
  otp: String,
  otpExpiry: Date
}, { timestamps: true });

const buyerSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: String,
  address: String
}, { timestamps: true });

// New unified model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['buyer', 'vendor'], required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  businessName: { type: String, required: function() { return this.role === 'vendor'; } },
  logo: { type: String },
  about: { type: String, default: '' },
  isVerified: { type: Boolean, default: function() { return this.role === 'buyer'; } },
  catalogId: { type: String, unique: true, sparse: true },
  address: { type: String, trim: true },
  resetOTP: { type: String },
  resetOTPExpires: { type: Date },
  otp: { type: String },
  otpExpiry: { type: Date }
}, { timestamps: true });

const OldVendor = mongoose.model('OldVendor', vendorSchema, 'vendors');
const OldBuyer = mongoose.model('OldBuyer', buyerSchema, 'buyers');
const User = mongoose.model('User', userSchema);

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Migrate vendors
    const vendors = await OldVendor.find({});
    console.log(`Found ${vendors.length} vendors to migrate`);

    for (const vendor of vendors) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: vendor.email });
      if (existingUser) {
        console.log(`User with email ${vendor.email} already exists, skipping...`);
        continue;
      }

      const newUser = new User({
        email: vendor.email,
        password: vendor.password,
        role: 'vendor',
        name: vendor.name,
        phone: vendor.phoneNumber,
        businessName: vendor.businessName,
        logo: vendor.logo,
        about: vendor.about || '',
        isVerified: vendor.isVerified || false,
        catalogId: vendor.catalogId,
        otp: vendor.otp,
        otpExpiry: vendor.otpExpiry,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt
      });

      await newUser.save();
      console.log(`Migrated vendor: ${vendor.businessName}`);
    }

    // Migrate buyers
    const buyers = await OldBuyer.find({});
    console.log(`Found ${buyers.length} buyers to migrate`);

    for (const buyer of buyers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: buyer.email });
      if (existingUser) {
        console.log(`User with email ${buyer.email} already exists, skipping...`);
        continue;
      }

      const newUser = new User({
        email: buyer.email,
        password: buyer.password,
        role: 'buyer',
        name: buyer.name,
        phone: buyer.phone,
        address: buyer.address,
        isVerified: true,
        createdAt: buyer.createdAt,
        updatedAt: buyer.updatedAt
      });

      await newUser.save();
      console.log(`Migrated buyer: ${buyer.name}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();