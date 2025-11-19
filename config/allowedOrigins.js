const allowedOrigins = [
  process.env.NODE_ENV === 'production' ? 'https://www.el-in.ca' : 'http://localhost:3000',
  'https://web.postman.co/',
];

module.exports = allowedOrigins;
