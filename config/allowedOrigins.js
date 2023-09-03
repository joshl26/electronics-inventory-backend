const allowedOrigins = [
  process.env.NODE_ENV === "production"
    ? "https://electronics-inventory-client.onrender.com"
    : "http://localhost:3000",

  // "https://web.postman.co/",
  // "https://www.el-in.ca",
];

module.exports = allowedOrigins;
