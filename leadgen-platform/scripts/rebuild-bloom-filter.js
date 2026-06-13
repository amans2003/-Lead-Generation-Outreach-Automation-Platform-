#!/usr/bin/env node
'use strict';

/**
 * rebuild-bloom-filter.js
 *
 * Streams every phoneHash from the SeenLead collection into the Redis Bloom
 * Filter.  Run this after a Redis flush or on first deploy to re-sync the
 * in-memory filter with the authoritative MongoDB registry.
 *
 * Usage:
 *   node scripts/rebuild-bloom-filter.js
 *
 * The script:
 *  1. Connects to MongoDB and Redis using .env values.
 *  2. Reserves (or reuses) the Bloom Filter via BF.RESERVE.
 *  3. Streams SeenLead phoneHash values in batches of 500 via cursor.
 *  4. Adds each batch with BF.MADD.
 *  5. Exits cleanly when done.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });

const mongoose  = require('mongoose');
const Redis     = require('ioredis');

const MONGODB_URI     = process.env.MONGODB_URI;
const REDIS_URL       = process.env.REDIS_URL;
const FILTER_KEY      = 'leadgen:seen_phones';
const BLOOM_CAPACITY  = Number(process.env.BLOOM_FILTER_CAPACITY)  || 10_000_000;
const BLOOM_ERROR     = Number(process.env.BLOOM_FILTER_ERROR_RATE) || 0.001;
const BATCH_SIZE      = 500;

// ── Minimal SeenLead schema (just the field we need) ───────────────────────
const SeenLeadSchema = new mongoose.Schema({ phoneHash: String }, { collection: 'seenleads' });
const SeenLead = mongoose.model('SeenLeadRebuild', SeenLeadSchema);

async function main() {
  console.log('[rebuild-bloom] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
  console.log('[rebuild-bloom] MongoDB connected.');

  console.log('[rebuild-bloom] Connecting to Redis...');
  const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
  await new Promise((res, rej) => {
    redis.once('ready', res);
    redis.once('error', rej);
  });
  console.log('[rebuild-bloom] Redis connected.');

  // Reserve or reuse the filter
  try {
    await redis.call('BF.RESERVE', FILTER_KEY, String(BLOOM_ERROR), String(BLOOM_CAPACITY));
    console.log('[rebuild-bloom] Bloom filter created: capacity=' + BLOOM_CAPACITY);
  } catch (err) {
    if (err.message && err.message.includes('item exists')) {
      console.log('[rebuild-bloom] Bloom filter already exists — reusing.');
    } else {
      console.error('[rebuild-bloom] BF.RESERVE failed: ' + err.message);
      console.log('[rebuild-bloom] Continuing without bloom filter (MongoDB dedup only).');
      await cleanup(redis);
      return;
    }
  }

  const total = await SeenLead.countDocuments();
  console.log('[rebuild-bloom] Total SeenLead documents: ' + total);

  let processed = 0;
  const cursor = SeenLead.find({}, { phoneHash: 1, _id: 0 }).cursor();
  let batch = [];

  for await (const doc of cursor) {
    if (doc.phoneHash) batch.push(doc.phoneHash);

    if (batch.length >= BATCH_SIZE) {
      await redis.call('BF.MADD', FILTER_KEY, ...batch);
      processed += batch.length;
      batch = [];
      process.stdout.write('\r[rebuild-bloom] Loaded ' + processed + ' / ' + total);
    }
  }

  if (batch.length > 0) {
    await redis.call('BF.MADD', FILTER_KEY, ...batch);
    processed += batch.length;
  }

  console.log('\n[rebuild-bloom] Done! Loaded ' + processed + ' hashes into Bloom filter.');
  await cleanup(redis);
}

async function cleanup(redis) {
  try { redis.disconnect(); } catch (_) {}
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(0);
}

main().catch((err) => {
  console.error('[rebuild-bloom] Fatal error:', err.message);
  process.exit(1);
});
