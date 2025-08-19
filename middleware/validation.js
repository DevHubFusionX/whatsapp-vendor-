const { body, validationResult } = require('express-validator');

// Input sanitization and validation
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Product validation rules
const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be 1-100 characters')
    .customSanitizer(sanitizeInput),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .customSanitizer(sanitizeInput)
];

// Vendor validation rules
const vendorValidation = [
  body('businessName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Business name must be 1-100 characters')
    .customSanitizer(sanitizeInput),
  body('phoneNumber')
    .isMobilePhone()
    .withMessage('Valid phone number required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  productValidation,
  vendorValidation,
  handleValidationErrors,
  sanitizeInput
};