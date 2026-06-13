#!/usr/bin/env node
'use strict';

/**
 * seed.js — Inserts a set of realistic-looking test leads into MongoDB.
 *
 * Usage:
 *   node scripts/seed.js [--count=50]
 *
 * All phone numbers are fake (start with 6000 prefix) and will not trigger
 * real outreach.  The script honours the dedup system — it calls DedupService
 * so duplicate runs are idempotent.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });

const mongoose = require('mongoose');
const crypto   = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;

// ── Minimal schemas ───────────────────────────────────────────────────────
const leadSchema = new mongoose.Schema({
  businessName: String, ownerName: String, phone: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true }, address: String, city: String,
  state: String, category: String, source: String, status: { type: String, default: 'new' },
  scrapeDate: String, scrapedAt: Date,
}, { timestamps: true, collection: 'leads' });

const seenSchema = new mongoose.Schema({
  phoneHash: { type: String, unique: true }, phone: String, source: String,
  firstSeenAt: { type: Date, default: Date.now },
}, { collection: 'seenleads' });

const Lead     = mongoose.model('SeedLead', leadSchema);
const SeenLead = mongoose.model('SeedSeenLead', seenSchema);

// ── Sample data ───────────────────────────────────────────────────────────
const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Jaipur'];
const CATEGORIES = ['shoes', 'clothes', 'skincare', 'food', 'jewellery', 'supplements', 'accessories'];
const STATES = { Mumbai: 'Maharashtra', Delhi: 'Delhi', Bengaluru: 'Karnataka',
  Hyderabad: 'Telangana', Chennai: 'Tamil Nadu', Pune: 'Maharashtra', Jaipur: 'Rajasthan' };
const SOURCES = ['justdial', 'sulekha', 'google_maps', 'tradeindia'];

const FIRST_NAMES = ['Ravi', 'Sunil', 'Priya', 'Anjali', 'Vikram', 'Meera', 'Rahul', 'Neha', 'Amit', 'Pooja'];
const BIZ_SUFFIXES = ['Traders', 'Enterprises', 'Store', 'Shop', 'Boutique', 'Fashion House', 'Gallery', 'Mart', 'Hub', 'Collections'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function fakeLead(index) {
  const firstName = rand(FIRST_NAMES);
  const suffix    = rand(BIZ_SUFFIXES);
  const city      = rand(CITIES);
  const category  = rand(CATEGORIES);
  // Fake number: starts with 6000 so it looks like a mobile but is clearly test data
  const digits    = String(index).padStart(6, '0');
  const phone     = '+916000' + digits;

  return {
    businessName: `${firstName} ${suffix}`,
    ownerName:    firstName + ' Kumar',
    phone,
    email:        `test${index}@example.com`,
    address:      `${randInt(1, 999)}, Test Street, ${city}`,
    city,
    state:        STATES[city] || '',
    category,
    source:       rand(SOURCES),
    status:       'new',
    scrapeDate:   new Date().toISOString().slice(0, 10),
    scrapedAt:    new Date(),
  };
}

async function main() {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 50;

  console.log('[seed] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
  console.log('[seed] Connected. Seeding ' + count + ' leads...');

  let inserted = 0;
  let skipped  = 0;

  for (let i = 1; i <= count; i++) {
    const leadData = fakeLead(i);
    const hash     = crypto.createHash('sha256').update(leadData.phone).digest('hex');

    // Check / register in SeenLead
    const exists = await SeenLead.exists({ phoneHash: hash });
    if (exists) { skipped++; continue; }

    try {
      await Lead.create(leadData);
      await SeenLead.create({ phoneHash: hash, phone: leadData.phone, source: leadData.source });
      inserted++;
    } catch (err) {
      if (err.code === 11000) { skipped++; }
      else { console.warn('[seed] Error inserting lead ' + i + ': ' + err.message); }
    }
  }

  console.log('[seed] Done. Inserted: ' + inserted + ', Skipped (dupes): ' + skipped);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Fatal:', err.message);
  process.exit(1);
});
