// Description: Defining routes for authentication: login, token refresh, and logout
// File: routes/authRoutes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const loginLimiter = require("../middleware/loginLimiter");
const verifyJWT = require("../middleware/verifyJWT");
const { validate, validationRules } = require("../middleware/sanitization");

// Public routes
router
  .route("/")
  .post(
    loginLimiter,
    validate([
      validationRules.username,
      validationRules.password
    ]),
    authController.login
  );

router
  .route("/refresh")
  .get(authController.refresh);

router
  .route("/logout")
  .post(authController.logout);

// Protected routes (require JWT)
router.use(verifyJWT); // Apply verifyJWT to all routes below

router
  .route("/logout-all")
  .post(authController.logoutAll);

router
  .route("/sessions")
  .get(authController.getSessions);

router
  .route("/sessions/:sessionId")
  .delete(authController.revokeSession);

module.exports = router;