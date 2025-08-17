const jwt = require('jsonwebtoken');
const Buyer = require('../models/Buyer');

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
    
    const buyer = await Buyer.findById(decoded.buyerId);
    
    if (!buyer) {
      return res.status(401).json({ message: 'Invalid token. Please login again.' });
    }

    req.buyer = buyer;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please login again.' });
  }
};

module.exports = buyerAuth;