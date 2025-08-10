const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const vendor = await Vendor.findById(decoded.vendorId);
    
    if (!vendor) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;