// desc: Middleware to verify JWT tokens in incoming requests
// file: middleware/verifyJWT.js

const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  // Check if token is blacklisted
  const blacklisted = await TokenBlacklist.findOne({ token });
  if (blacklisted) {
    return res.status(401).json({ message: "Token has been revoked" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;
    next();
  });
};

module.exports = verifyJWT;