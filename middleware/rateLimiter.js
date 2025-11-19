const rateLimit = require('express-rate-limit');

// Different rate limiters for different operations
const rateLimiters = {
  // Strict limiter for authentication
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later.',
  }),

  // Read operations - more lenient
  read: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
  }),

  // Write operations - moderate
  write: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many write operations, please try again later.',
  }),

  // File uploads - very strict
  upload: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Upload limit reached, please try again later.',
  }),
};

module.exports = rateLimiters;
