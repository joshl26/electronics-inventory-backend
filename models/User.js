// defiinition of the User model using Mongoose
// file: models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  roles: [
    {
      type: String,
      default: "Employee",
    },
  ],
  active: {
    type: Boolean,
    default: true,
  },
  colorMode: {
    type: String,
    default: "Light",
  },
  partsListView: {
    type: String,
    default: "Table",
  },
});

module.exports = mongoose.model("User", userSchema);
