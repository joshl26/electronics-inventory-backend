// tests/testSetup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

module.exports = {
  async startInMemoryMongo() {
    mongod = await MongoMemoryServer.create();
    process.env.DATABASE_URI = mongod.getUri();
    return mongod;
  },
  async stopInMemoryMongo() {
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  },
  async clearDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  },
};
