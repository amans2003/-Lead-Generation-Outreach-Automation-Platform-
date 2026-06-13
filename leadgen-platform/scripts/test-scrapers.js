#!/usr/bin/env node
'use strict';

/**
 * test-scrapers.js — Runs each scraper for one query and prints the results.
 *
 * Usage:
 *   node scripts/test-scrapers.js [--scraper=justdial] [--city=Mumbai] [--category=shoes]
 *
 * Defaults: runs all scrapers against Mumbai / shoes
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });

// ── CLI args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => { const [k, v] = a.slice(2).split('='); return [k, v || true]; })
);

const targetScraper = args.scraper || 'all';
const city     = args.city     || 'Mumbai';
const category = args.category || 'shoes';
const page     = parseInt(args.page, 10) || 1;

// ── Scraper registry ──────────────────────────────────────────────────────
const SCRAPERS = {
  justdial:   () => require('../server/src/services/scraper/scrapers/JustDialScraper'),
  sulekha:    () => require('../server/src/services/scraper/scrapers/SulekhaScraper'),
  google_maps:() => require('../server/src/services/scraper/scrapers/GoogleMapsScraper'),
  indiamart:  () => require('../server/src/services/scraper/scrapers/IndiamartScraper'),
  tradeindia: () => require('../server/src/services/scraper/scrapers/TradeindiaScraper'),
};

const selectedScrapers = targetScraper === 'all'
  ? Object.entries(SCRAPERS)
  : [[targetScraper, SCRAPERS[targetScraper]]];

async function runScraper(name, loaderFn) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Scraper : ${name}`);
  console.log(`Query   : ${category} in ${city} (page ${page})`);
  console.log(`${'─'.repeat(60)}`);

  let scraper;
  try {
    scraper = loaderFn();
  } catch (err) {
    console.error(`  ✗ Failed to load scraper: ${err.message}`);
    return;
  }

  const startMs = Date.now();
  try {
    const leads = await scraper.scrape({ source: name, city, category, page });
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

    console.log(`  ✓ ${leads.length} leads returned in ${elapsed}s`);
    leads.slice(0, 5).forEach((l, i) => {
      console.log(`  [${i + 1}] ${l.businessName || 'N/A'} | ${l.phone || 'no phone'} | ${l.city || city}`);
    });
    if (leads.length > 5) console.log(`  ... and ${leads.length - 5} more`);

  } catch (err) {
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.error(`  ✗ Scraper threw after ${elapsed}s: ${err.message}`);
  }
}

async function main() {
  console.log('LeadGen Platform — Scraper Test Runner');
  console.log('======================================');

  for (const [name, loaderFn] of selectedScrapers) {
    if (!loaderFn) {
      console.error(`Unknown scraper: "${name}". Available: ${Object.keys(SCRAPERS).join(', ')}`);
      continue;
    }
    await runScraper(name, loaderFn);
  }

  console.log('\nAll done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
