const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  permissions: [
    {
      type: String,
      enum: ['read', 'write', 'delete', 'admin'],
    },
  ],
  active: {
    type: Boolean,
    default: true,
  },
  lastUsed: Date,
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Static method to generate API key
apiKeySchema.statics.generateKey = function () {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('APIKey', apiKeySchema);
