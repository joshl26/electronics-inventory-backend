// routes/apiKeyRoutes.js
const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const APIKey = require("../models/APIKey");
const asyncHandler = require("express-async-handler");

// Only admins can manage API keys
router.use(verifyJWT);

// @desc Generate new API key
// @route POST /api-keys
// @access Private/Admin
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, permissions, expiresAt } = req.body;

    if (!name || !permissions) {
      return res.status(400).json({
        message: "Name and permissions required",
      });
    }

    const key = APIKey.generateKey();

    const apiKey = await APIKey.create({
      key,
      name,
      permissions,
      expiresAt: expiresAt || null,
    });

    res.status(201).json({
      message: "API key created",
      key: apiKey.key, // Show key only once
      name: apiKey.name,
      permissions: apiKey.permissions,
    });
  })
);

// @desc List all API keys
// @route GET /api-keys
// @access Private/Admin
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const apiKeys = await APIKey.find().select("-key").sort("-createdAt");
    res.json(apiKeys);
  })
);

// @desc Revoke API key
// @route DELETE /api-keys/:id
// @access Private/Admin
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({ message: "API key not found" });
    }

    apiKey.active = false;
    await apiKey.save();

    res.json({ message: "API key revoked" });
  })
);

module.exports = router;