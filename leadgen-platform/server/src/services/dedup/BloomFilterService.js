'use strict';

/**
 * BloomFilterService
 *
 * Wraps the RedisBloom / Redis Stack BF (Bloom Filter) commands via ioredis.
 *
 * Design:
 *  - Static class – a single shared filter lives at FILTER_KEY.
 *  - Call BloomFilterService.initialize(redisClient) once at boot.
 *  - If the Redis Stack BF module is not loaded, the service degrades gracefully:
 *      mightExist() always returns false (let the DB be the truth source).
 *
 * All hashes stored are hex SHA-256 digests produced by DedupService.
 */

const logger = require('../../config/logger');

class BloomFilterService {
  // ── Configuration ────────────────────────────────────────────────────────
  static FILTER_KEY = 'leadgen:seen_phones';
  static CAPACITY   = 10_000_000; // 10 M items before false-positive rate degrades
  static ERROR_RATE = 0.001;      // 0.1 % false-positive rate

  // ── Internal state ───────────────────────────────────────────────────────
  static client      = null;
  static available   = false; // set to true only when BF module confirmed working

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Initialize the Bloom Filter, creating it in Redis if it does not already exist.
   * Must be called once before any other method.
   *
   * @param {import('ioredis').Redis} redisClient - An already-connected ioredis instance.
   */
  static async initialize(redisClient) {
    BloomFilterService.client = redisClient;

    try {
      // BF.RESERVE key error_rate capacity [EXPANSION expansion] [NONSCALING]
      // Throws an error if the key already exists — we catch and ignore that case.
      await redisClient.call(
        'BF.RESERVE',
        BloomFilterService.FILTER_KEY,
        String(BloomFilterService.ERROR_RATE),
        String(BloomFilterService.CAPACITY)
      );
      logger.info('BloomFilterService: Bloom filter created', {
        key:       BloomFilterService.FILTER_KEY,
        capacity:  BloomFilterService.CAPACITY,
        errorRate: BloomFilterService.ERROR_RATE,
      });
    } catch (err) {
      // "ERR item exists" means the filter was already created — that is fine.
      if (err.message && err.message.includes('item exists')) {
        logger.info('BloomFilterService: Bloom filter already exists, reusing', {
          key: BloomFilterService.FILTER_KEY,
        });
      } else if (
        err.message &&
        (err.message.includes('unknown command') ||
          err.message.includes('ERR unknown') ||
          err.message.includes('WRONGTYPE'))
      ) {
        // Redis Stack / RedisBloom module not loaded
        logger.warn(
          'BloomFilterService: BF module not available – bloom filter disabled. ' +
          'Deduplication will rely on MongoDB only.',
          { error: err.message }
        );
        BloomFilterService.available = false;
        return;
      } else {
        // Unexpected error – log but continue without bloom filter
        logger.warn('BloomFilterService: Unexpected error during BF.RESERVE – bloom filter disabled', {
          error: err.message,
        });
        BloomFilterService.available = false;
        return;
      }
    }

    BloomFilterService.available = true;
  }

  /**
   * Check whether a hash *might* exist in the filter.
   *
   * @param {string} hash - Hex SHA-256 digest.
   * @returns {Promise<boolean>} true if the hash is (probably) already seen; false if definitely new.
   */
  static async mightExist(hash) {
    if (!BloomFilterService.available || !BloomFilterService.client) return false;

    try {
      const result = await BloomFilterService.client.call(
        'BF.EXISTS',
        BloomFilterService.FILTER_KEY,
        hash
      );
      // BF.EXISTS returns 1 (found / maybe) or 0 (definitely not)
      return result === 1;
    } catch (err) {
      logger.warn('BloomFilterService.mightExist error – defaulting to false', {
        error: err.message,
      });
      return false;
    }
  }

  /**
   * Record a single hash in the filter.
   *
   * @param {string} hash - Hex SHA-256 digest.
   * @returns {Promise<void>}
   */
  static async add(hash) {
    if (!BloomFilterService.available || !BloomFilterService.client) return;

    try {
      await BloomFilterService.client.call(
        'BF.ADD',
        BloomFilterService.FILTER_KEY,
        hash
      );
    } catch (err) {
      logger.warn('BloomFilterService.add error', { error: err.message });
    }
  }

  /**
   * Record multiple hashes in the filter in a single round-trip.
   *
   * @param {string[]} hashes - Array of hex SHA-256 digests.
   * @returns {Promise<void>}
   */
  static async addBulk(hashes) {
    if (!BloomFilterService.available || !BloomFilterService.client) return;
    if (!hashes || hashes.length === 0) return;

    try {
      // BF.MADD key item [item ...]
      await BloomFilterService.client.call(
        'BF.MADD',
        BloomFilterService.FILTER_KEY,
        ...hashes
      );
    } catch (err) {
      logger.warn('BloomFilterService.addBulk error', { error: err.message });
    }
  }
}

module.exports = BloomFilterService;
