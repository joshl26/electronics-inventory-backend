const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const loginLimiter = require("../middleware/loginLimiter");

/**
 * @swagger
 * /auth:
 *  post:
 *     tags:
 *     - Auth
 *
 */

/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Login user
 *     description: Login user
 *     responses:
 *       200:
 *         description: Login user
 */

router.route("/").post(loginLimiter, authController.login);

/**
 * @swagger
 * /auth/refresh/:
 *   get:
 *     tags:
 *     - Auth
 *
 */

/**
 * @swagger
 * /auth/refresh/:
 *   get:
 *     summary: Refresh user auth
 *     description: Refresh user auth
 *     responses:
 *       200:
 *         description: Refresh user auth
 */

router.route("/refresh").get(authController.refresh);

/**
 * @swagger
 * /auth/logout/:
 *   post:
 *     tags:
 *     - Auth
 *
 */

/**
 * @swagger
 * /auth/logout/:
 *   post:
 *     summary: Logout user
 *     description: Logout user
 *     responses:
 *       200:
 *         description: Logout user
 */

router.route("/logout").post(authController.logout);

module.exports = router;
