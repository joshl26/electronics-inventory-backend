const allowedOrigins = [
  process.env.NODE_ENV === 'production' ? 'https://electronics-inventory-client.onrender.com' : 'http://localhost:3000',
  'https://web.postman.co',
];

module.exports = allowedOrigins;
