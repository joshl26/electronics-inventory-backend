// Description: Controller for authentication (login, refresh token, logout)
// File: controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const securityLogger = require('../middleware/securityLogger');

// Helper function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      UserInfo: {
        username: user.username,
        roles: user.roles,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    {
      username: user.username,
      tokenId: crypto.randomBytes(32).toString('hex'), // Unique token ID
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );

  return { accessToken, refreshToken };
};

// @desc Login
// @route POST /auth
// @access Public
const login = asyncHandler(async (req, res) => {
  console.log('LOGIN DEBUG:', {
    body: req.body,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  const { username, password } = req.body;
  // console.log(`Login attempt for user: ${username} from IP: ${req.ip}`);

  if (!username || !password) {
    securityLogger.logFailedLogin(username || 'unknown', req.ip, 'Missing credentials');
    return res.status(400).json({ message: 'All fields are required' });
  }

  const foundUser = await User.findOne({ username }).exec();
  console.log(`User lookup for ${username}: ${foundUser ? 'found' : 'not found'}`);

  if (!foundUser) {
    securityLogger.logFailedLogin(username, req.ip, 'User not found');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!foundUser.active) {
    securityLogger.logFailedLogin(username, req.ip, 'Account inactive');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const match = await bcrypt.compare(password, foundUser.password);

  if (!match) {
    securityLogger.logFailedLogin(username, req.ip, 'Invalid password');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokens(foundUser);

  // Store refresh token in database
  foundUser.refreshTokens.push({
    token: refreshToken,
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Limit to 5 active sessions per user
  if (foundUser.refreshTokens.length > 5) {
    foundUser.refreshTokens = foundUser.refreshTokens.slice(-5);
  }

  await foundUser.save();

  // Log successful login
  securityLogger.logSuccessfulLogin(
    username,
    req.ip,
    req.headers['user-agent'] || 'Unknown device',
  );

  // Create secure cookie with refresh token
  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
});

// @desc Refresh - WITH TOKEN ROTATION
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    securityLogger.logSuspiciousActivity('Refresh attempt without token', req);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const oldRefreshToken = cookies.jwt;

  // Verify old refresh token
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    securityLogger.logSuspiciousActivity('Invalid refresh token', req);
    return res.status(403).json({ message: 'Forbidden', error: err.message });
  }

  const foundUser = await User.findOne({
    username: decoded.username,
  }).exec();

  if (!foundUser) {
    securityLogger.logSuspiciousActivity(
      `Refresh token for non-existent user: ${decoded.username}`,
      req,
    );
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if refresh token exists in database
  const tokenExists = foundUser.refreshTokens.some((rt) => rt.token === oldRefreshToken);

  if (!tokenExists) {
    // Token reuse detected! Possible attack
    securityLogger.logTokenReuse(decoded.username, req.ip);

    // Remove all refresh tokens for this user
    foundUser.refreshTokens = [];
    await foundUser.save();

    return res.status(403).json({ message: 'Token reuse detected' });
  }

  // Remove old refresh token
  foundUser.refreshTokens = foundUser.refreshTokens.filter((rt) => rt.token !== oldRefreshToken);

  // Generate new tokens (rotation)
  const { accessToken, refreshToken } = generateTokens(foundUser);

  // Store new refresh token
  foundUser.refreshTokens.push({
    token: refreshToken,
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  await foundUser.save();

  // Send new refresh token as cookie
  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
});

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.sendStatus(204);
  }

  const refreshToken = cookies.jwt;

  // Verify and decode token
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Remove refresh token from database
    const foundUser = await User.findOne({
      username: decoded.username,
    }).exec();

    if (foundUser) {
      foundUser.refreshTokens = foundUser.refreshTokens.filter((rt) => rt.token !== refreshToken);
      await foundUser.save();

      // Log logout
      securityLogger.logLogout(decoded.username, req.ip);
    }
  } catch (err) {
    // Token invalid, but still clear cookie
    securityLogger.logSuspiciousActivity(`Logout with invalid token ${err.message}`, req);
  }

  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'None',
    secure: true,
  });

  res.json({ message: 'Logged out successfully' });
});

// @desc Logout from all devices
// @route POST /auth/logout-all
// @access Private
const logoutAll = asyncHandler(async (req, res) => {
  const username = req.user; // From verifyJWT middleware

  const foundUser = await User.findOne({ username }).exec();

  if (!foundUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Remove all refresh tokens
  const sessionCount = foundUser.refreshTokens.length;
  foundUser.refreshTokens = [];
  await foundUser.save();

  // Log logout from all devices
  securityLogger.logLogoutAll(username, req.ip);
  console.log(`User ${username} logged out from ${sessionCount} devices`);

  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'None',
    secure: true,
  });

  res.json({
    message: `Logged out from all devices (${sessionCount} sessions terminated)`,
  });
});

// @desc Get active sessions
// @route GET /auth/sessions
// @access Private
const getSessions = asyncHandler(async (req, res) => {
  const username = req.user; // From verifyJWT middleware

  const foundUser = await User.findOne({ username }).select('refreshTokens').exec();

  if (!foundUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Return sanitized session info (without actual tokens)
  const sessions = foundUser.refreshTokens.map((rt, index) => ({
    id: index + 1,
    deviceInfo: rt.deviceInfo || 'Unknown device',
    ipAddress: rt.ipAddress || 'Unknown IP',
    createdAt: rt.createdAt,
    isCurrent: req.cookies?.jwt === rt.token,
  }));

  res.json({
    sessions,
    totalSessions: sessions.length,
  });
});

// @desc Revoke specific session
// @route DELETE /auth/sessions/:sessionId
// @access Private
const revokeSession = asyncHandler(async (req, res) => {
  const username = req.user; // From verifyJWT middleware
  const sessionIndex = parseInt(req.params.sessionId) - 1;

  const foundUser = await User.findOne({ username }).exec();

  if (!foundUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (sessionIndex < 0 || sessionIndex >= foundUser.refreshTokens.length) {
    return res.status(404).json({ message: 'Session not found' });
  }

  // Remove the specific session
  const revokedSession = foundUser.refreshTokens[sessionIndex];
  foundUser.refreshTokens.splice(sessionIndex, 1);
  await foundUser.save();

  securityLogger.logSuspiciousActivity(
    `Session revoked - Device: ${revokedSession.deviceInfo}`,
    req,
  );

  res.json({ message: 'Session revoked successfully' });
});

module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  getSessions,
  revokeSession,
};
