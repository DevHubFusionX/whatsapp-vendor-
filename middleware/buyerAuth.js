const jwt = require('jsonwebtoken');
const User = require('../models/User');

const buyerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. Please login first.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'buyer') {
      return res.status(401).json({ message: 'Access denied. Buyer access required.' });
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'buyer') {
      return res.status(401).json({ message: 'Invalid token. Please login again.' });
    }

    req.buyer = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please login again.' });
  }
};

module.exports = buyerAuth;