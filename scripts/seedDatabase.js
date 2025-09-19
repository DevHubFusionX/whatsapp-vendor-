const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Buyer = require('../models/Buyer');
const Product = require('../models/Product');
require('dotenv').config();

const vendors = [
  { name: 'John Smith', email: 'vendor1@example.com', businessName: 'Tech Store', phone: '1234567890' },
  { name: 'Sarah Johnson', email: 'vendor2@example.com', businessName: 'Fashion Hub', phone: '1234567891' },
  { name: 'Mike Wilson', email: 'vendor3@example.com', businessName: 'Food Corner', phone: '1234567892' },
  { name: 'Lisa Brown', email: 'vendor4@example.com', businessName: 'Home Essentials', phone: '1234567893' },
  { name: 'David Lee', email: 'vendor5@example.com', businessName: 'Sports World', phone: '1234567894' }
];

const buyers = [
  { name: 'Alice Cooper', email: 'buyer1@example.com', phone: '9876543210', address: '123 Main St, City' },
  { name: 'Bob Martin', email: 'buyer2@example.com', phone: '9876543211', address: '456 Oak Ave, Town' }
];

const productTemplates = [
  { name: 'Smartphone', price: 50000, category: 'Electronics' },
  { name: 'Laptop', price: 120000, category: 'Electronics' },
  { name: 'T-Shirt', price: 3000, category: 'Fashion' },
  { name: 'Jeans', price: 8000, category: 'Fashion' },
  { name: 'Pizza', price: 2500, category: 'Food' },
  { name: 'Burger', price: 1500, category: 'Food' },
  { name: 'Sofa', price: 45000, category: 'Home' },
  { name: 'Table', price: 15000, category: 'Home' },
  { name: 'Football', price: 2000, category: 'Sports' },
  { name: 'Basketball', price: 3500, category: 'Sports' }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create vendors
    const createdVendors = [];
    for (const vendorData of vendors) {
      const vendor = new User({
        ...vendorData,
        password: hashedPassword,
        role: 'vendor',
        isVerified: true
      });
      await vendor.save();
      createdVendors.push(vendor);
      console.log(`Created vendor: ${vendor.businessName}`);
    }

    // Create buyers
    for (const buyerData of buyers) {
      const buyer = new Buyer({
        ...buyerData,
        password: hashedPassword
      });
      await buyer.save();
      console.log(`Created buyer: ${buyer.name}`);
    }

    // Create products for each vendor
    for (const vendor of createdVendors) {
      for (let i = 0; i < 10; i++) {
        const template = productTemplates[i];
        const product = new Product({
          name: `${template.name} ${i + 1}`,
          description: `High quality ${template.name.toLowerCase()} from ${vendor.businessName}`,
          price: template.price + Math.floor(Math.random() * 5000),
          category: template.category,
          vendor: vendor._id,
          isActive: true,
          featured: Math.random() > 0.7
        });
        await product.save();
      }
      console.log(`Created 10 products for ${vendor.businessName}`);
    }

    console.log('\nDatabase seeded successfully!');
    console.log('Vendor login: vendor1@example.com / password123');
    console.log('Buyer login: buyer1@example.com / password123');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedDatabase();