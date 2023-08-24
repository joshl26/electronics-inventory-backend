const express = require("express");
const router = express.Router();
const path = require("path");

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *     - Root
 *
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Return backend homepage
 *     description: Return backend homepage
 *     responses:
 *       200:
 *         description: Return backend homepage
 */

router.get("^/$|/index(.html)?", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "index.html"));
});

module.exports = router;
