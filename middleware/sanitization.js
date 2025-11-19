const { body, validationResult } = require('express-validator');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

// XSS protection
const xssProtection = xss();

// NoSQL injection protection
const noSQLInjectionProtection = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized ${key} in request`);
  },
});

// Validation middleware factory
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
  };
};

// Common validation rules
const validationRules = {
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  email: body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email address'),

  partName: body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Part name must be between 1 and 200 characters'),

  quantity: body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
};

module.exports = {
  xssProtection,
  noSQLInjectionProtection,
  validate,
  validationRules,
};
