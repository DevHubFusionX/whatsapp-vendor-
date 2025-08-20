const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Buyer = require('./models/Buyer');
const Product = require('./models/Product');
const Order = require('./models/Order');

const resetDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Buyer.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Database cleared successfully');

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create sample vendors
    const vendors = [
      {
        email: 'vendor1@example.com',
        password: hashedPassword,
        role: 'vendor',
        name: 'John Smith',
        businessName: 'Tech Solutions Ltd',
        phone: '+234-801-234-5678',
        about: 'Leading provider of technology solutions and gadgets',
        isVerified: true
      },
      {
        email: 'vendor2@example.com',
        password: hashedPassword,
        role: 'vendor',
        name: 'Sarah Johnson',
        businessName: 'Fashion Hub',
        phone: '+234-802-345-6789',
        about: 'Premium fashion and accessories for modern lifestyle',
        isVerified: true
      },
      {
        email: 'vendor3@example.com',
        password: hashedPassword,
        role: 'vendor',
        name: 'Mike Wilson',
        businessName: 'Home & Garden Store',
        phone: '+234-803-456-7890',
        about: 'Everything you need for your home and garden',
        isVerified: true
      },
      {
        email: 'vendor4@example.com',
        password: hashedPassword,
        role: 'vendor',
        name: 'Lisa Brown',
        businessName: 'Healthy Foods Market',
        phone: '+234-804-567-8901',
        about: 'Organic and healthy food products',
        isVerified: true
      }
    ];

    console.log('Creating vendors...');
    const createdVendors = await User.insertMany(vendors);
    console.log(`Created ${createdVendors.length} vendors`);

    // Create sample buyers
    const buyers = [
      {
        email: 'buyer1@example.com',
        password: hashedPassword,
        role: 'buyer',
        name: 'Alice Cooper',
        phone: '+234-805-678-9012',
        address: '123 Main Street, Lagos'
      },
      {
        email: 'buyer2@example.com',
        password: hashedPassword,
        role: 'buyer',
        name: 'Bob Davis',
        phone: '+234-806-789-0123',
        address: '456 Oak Avenue, Abuja'
      },
      {
        email: 'buyer3@example.com',
        password: hashedPassword,
        role: 'buyer',
        name: 'Carol White',
        phone: '+234-807-890-1234',
        address: '789 Pine Road, Port Harcourt'
      }
    ];

    console.log('Creating buyers...');
    const createdBuyers = await User.insertMany(buyers);
    console.log(`Created ${createdBuyers.length} buyers`);

    // Create sample products
    const products = [
      // Tech Solutions Ltd products
      {
        name: 'Wireless Bluetooth Headphones',
        price: 15000,
        description: 'High-quality wireless headphones with noise cancellation',
        category: 'electronics',
        vendor: createdVendors[0]._id,
        featured: true,
        stock: 50
      },
      {
        name: 'Smartphone Stand',
        price: 3500,
        description: 'Adjustable phone stand for desk use',
        category: 'electronics',
        vendor: createdVendors[0]._id,
        stock: 100
      },
      // Fashion Hub products
      {
        name: 'Designer Handbag',
        price: 25000,
        description: 'Elegant leather handbag for professional women',
        category: 'fashion',
        vendor: createdVendors[1]._id,
        featured: true,
        stock: 20
      },
      {
        name: 'Casual T-Shirt',
        price: 5000,
        description: 'Comfortable cotton t-shirt in various colors',
        category: 'fashion',
        vendor: createdVendors[1]._id,
        stock: 75
      },
      // Home & Garden Store products
      {
        name: 'Indoor Plant Pot',
        price: 2500,
        description: 'Ceramic pot perfect for indoor plants',
        category: 'home',
        vendor: createdVendors[2]._id,
        stock: 30
      },
      {
        name: 'LED Table Lamp',
        price: 8000,
        description: 'Modern LED lamp with adjustable brightness',
        category: 'home',
        vendor: createdVendors[2]._id,
        featured: true,
        stock: 25
      },
      // Healthy Foods Market products
      {
        name: 'Organic Honey',
        price: 4500,
        description: 'Pure organic honey from local beekeepers',
        category: 'food',
        vendor: createdVendors[3]._id,
        stock: 40
      },
      {
        name: 'Mixed Nuts Pack',
        price: 3000,
        description: 'Healthy mix of almonds, cashews, and walnuts',
        category: 'food',
        vendor: createdVendors[3]._id,
        featured: true,
        stock: 60
      }
    ];

    console.log('Creating products...');
    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);

    console.log('\n=== DATABASE RESET COMPLETE ===');
    console.log('\nVendor Accounts:');
    createdVendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.businessName}`);
      console.log(`   Email: ${vendor.email}`);
      console.log(`   Password: password123`);
      console.log(`   Phone: ${vendor.phone}\n`);
    });

    console.log('Buyer Accounts:');
    createdBuyers.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.name}`);
      console.log(`   Email: ${buyer.email}`);
      console.log(`   Password: password123`);
      console.log(`   Phone: ${buyer.phone}\n`);
    });

    console.log('All accounts use password: password123');
    
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

resetDatabase();