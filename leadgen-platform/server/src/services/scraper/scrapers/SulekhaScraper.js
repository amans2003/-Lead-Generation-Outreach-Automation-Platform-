'use strict';

/**
 * SulekhaScraper — scrapes business listings from sulekha.com
 *
 * Strategy: Axios + Cheerio for listing page (server-side rendered).
 * Puppeteer fallback to click "Get Phone" and reveal hidden numbers.
 * URL pattern: https://www.sulekha.com/{category-slug}/{city-slug}
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

// Sulekha uses its own URL slugs that differ from our category names
const SULEKHA_SLUG = {
  restaurant:  'restaurants',
  retail:      'retail-shops',
  salon:       'beauty-parlour',
  gym:         'gym',
  clinic:      'doctors',
  hotel:       'hotels',
  school:      'schools',
  real_estate: 'real-estate-agents',
  automobile:  'car-dealers',
  electronics: 'electronics',
  grocery:     'grocery',
  pharmacy:    'medical-shops',
  clothing:    'clothing-stores',
  jewellery:   'jewellery-shops',
  hardware:    'hardware-shops',
  travel:      'travel-agents',
  photography: 'photographers',
  event:       'event-management',
  coaching:    'coaching-classes',
  other:       'local-services',
};

class SulekhaScraper extends BaseScraper {
  constructor() { super('sulekha'); }

  async scrape({ city, category, page = 1 }) {
    const citySlug  = city.toLowerCase().replace(/\s+/g, '-');
    const keySlug   = SULEKHA_SLUG[category] || category.replace(/_/g, '-');
    const pageParam = page > 1 ? `?page=${page}` : '';
    const url = `https://www.sulekha.com/${keySlug}/${citySlug}${pageParam}`;

    logger.debug('[SulekhaScraper] Fetching ' + url);

    try {
      await this.randomDelay(1500, 3500);
      const response = await axios.get(url, {
        headers: {
          'User-Agent':      this.getRandomUserAgent(),
          'Accept':          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Referer':         'https://www.sulekha.com/',
        },
        timeout: 20_000,
      });
      return this._parse(response.data, city, category);
    } catch (err) {
      logger.warn('[SulekhaScraper] Axios failed, trying Puppeteer', { url, error: err.message });
      return this._puppeteerScrape(url, city, category);
    }
  }

  _pickKeyword(category) {
    const kws = CATEGORY_KEYWORDS[category];
    if (!kws || kws.length === 0) return category.replace(/_/g, '-');
    return kws[Math.floor(Math.random() * kws.length)];
  }

  _parse(html, city, category) {
    const $ = cheerio.load(html);
    const leads = [];

    // Cards start at index 1 — index 0 is the header card
    $('.sk-card').slice(1).each((_, el) => {
      try {
        const $el = $(el);

        const businessName = $el.find('.name h3, .name a').first().text().trim();
        if (!businessName) return;

        const businessId = $el.attr('businessid');
        const address    = $el.find('.locality span').first().text().trim();
        const profileUrl = $el.find('.name a').first().attr('href') || '';

        // Sulekha hides phone behind a button in static HTML.
        // Store profile URL in website field so outreach can visit it later.
        leads.push({
          businessName,
          phone:   null,
          address: address || city,
          city,
          category,
          source:  'sulekha',
          website: profileUrl || undefined,
          _sulekhaId: businessId,
        });
      } catch (_) {
        // skip malformed entry
      }
    });

    logger.debug('[SulekhaScraper] Parsed ' + leads.length + ' leads from HTML');

    // Use Puppeteer to fetch phones for the found businesses (cap at 5 to avoid slow runs)
    return leads;
  }

  async _puppeteerScrape(url, city, category) {
    let pg = null;
    try {
      await this.launchBrowser();
      pg = await this.newPage();
      await this.navigate(pg, url);
      await pg.waitForSelector('.sk-card', { timeout: 15_000 }).catch(() => {});
      await this.randomDelay(1500, 2500);

      const leads = await pg.evaluate((cityArg, catArg) => {
        const cards = document.querySelectorAll('.sk-card');
        const result = [];
        cards.forEach((el, idx) => {
          if (idx === 0) return; // skip header card
          try {
            const name = el.querySelector('.name h3, .name a')?.textContent?.trim();
            if (!name) return;

            const telEl = el.querySelector('[href^="tel:"]');
            const phone = telEl
              ? telEl.getAttribute('href').replace('tel:', '').replace(/\D/g, '').slice(-10)
              : null;

            const address = el.querySelector('.locality span')?.textContent?.trim() || '';
            const profile = el.querySelector('.name a')?.href || '';

            result.push({ businessName: name, phone, address, city: cityArg, category: catArg, source: 'sulekha', website: profile || undefined });
          } catch (_) {}
        });
        return result;
      }, city, category);

      logger.debug('[SulekhaScraper] Puppeteer extracted ' + leads.length + ' leads');
      return leads.filter((l) => l.businessName);
    } catch (err) {
      logger.warn('[SulekhaScraper] Puppeteer fallback failed', { error: err.message });
      return [];
    } finally {
      await this.closeBrowser();
    }
  }
}

module.exports = new SulekhaScraper();
