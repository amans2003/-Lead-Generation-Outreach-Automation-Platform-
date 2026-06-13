'use strict';

const Redis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

/**
 * ioredis client connected to the URL defined in env.REDIS_URL.
 *
 * ioredis auto-reconnects by default (lazyConnect: false).
 * We disable the built-in crash-on-error so the rest of the app
 * can start even if Redis is momentarily unavailable.
 */
const redisClient = new Redis(env.REDIS_URL, {
  // Retry with exponential back-off up to 30 s
  retryStrategy(times) {
    const delay = Math.min(times * 200, 30000);
    logger.warn(`Redis retry attempt ${times}, next attempt in ${delay}ms`);
    return delay;
  },
  // Do NOT throw an unhandled error event when the connection fails —
  // we handle it in the 'error' listener below.
  enableOfflineQueue: true,
  maxRetriesPerRequest: null, // keep retrying blocked commands (useful for BullMQ)
  lazyConnect: false,
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', { error: err.message });
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

redisClient.on('reconnecting', (delay) => {
  logger.info(`Redis reconnecting in ${delay}ms`);
});

redisClient.on('end', () => {
  logger.warn('Redis connection ended (no more reconnect attempts)');
});

module.exports = redisClient;
