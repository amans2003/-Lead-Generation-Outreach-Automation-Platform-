'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

/**
 * Connects to MongoDB using the URI defined in env.MONGODB_URI.
 * Should be called once during server startup.
 * Throws on connection failure so the process can exit cleanly.
 */
async function connectDB() {
  const mongooseOptions = {
    // useNewUrlParser and useUnifiedTopology are true by default in Mongoose 6+
    // but setting them explicitly keeps older versions happy too.
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: env.NODE_ENV !== 'production', // never auto-build indexes in prod
    serverSelectionTimeoutMS: 5000,           // fail fast if Mongo is unreachable
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(env.MONGODB_URI, mongooseOptions);
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
    throw err; // bubble up so the caller (server startup) can handle it
  }

  // Log future disconnection / reconnection events
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB runtime error', { error: err.message });
  });
}

module.exports = { connectDB };
