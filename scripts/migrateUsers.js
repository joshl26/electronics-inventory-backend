require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("Connected to MongoDB");

    // Add refreshTokens array to all existing users
    const result = await User.updateMany(
      { refreshTokens: { $exists: false } },
      { $set: { refreshTokens: [] } }
    );

    console.log(`Updated ${result.modifiedCount} users`);
    
    await mongoose.connection.close();
    console.log("Migration complete");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateUsers();