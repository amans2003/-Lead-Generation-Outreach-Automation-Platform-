'use strict';

/**
 * SulekhaScraper — scrapes business listings from sulekha.com
 *
 * Strategy: Axios + Cheerio
 * URL pattern: https://www.sulekha.com/{category}/{city}
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

class SulekhaScraper extends BaseScraper {
  constructor() { super('sulekha'); }

  async scrape({ city, category, page = 1 }) {
    const keyword  = this._pickKeyword(category);
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const keySlug  = keyword.toLowerCase().replace(/\s+/g, '-');

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
      logger.warn('[SulekhaScraper] Request failed', { url, error: err.message });
      return [];
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _pickKeyword(category) {
    const kws = CATEGORY_KEYWORDS[category];
    if (!kws || kws.length === 0) return category.replace(/_/g, '-');
    return kws[Math.floor(Math.random() * kws.length)];
  }

  _parse(html, city, category) {
    const $ = cheerio.load(html);
    const leads = [];

    $('.slk-companyprofile-name, .provider-card, .splistcard').each((_, el) => {
      try {
        const $el = $(el);

        const businessName = $el.find('.comp-name, h2, .title').first().text().trim();
        if (!businessName) return;

        // Sulekha sometimes obfuscates numbers; pick what's visible
        const phoneRaw = $el.find('.phoneno, .contact-num, [data-phone]').first().text().trim()
          || $el.find('[data-phone]').first().attr('data-phone');

        const phone = this.extractPhone(phoneRaw);
        if (!phone) return;

        const address = $el.find('.address, .locality').first().text().trim();
        const email   = this.extractEmail($el.find('.email, a[href^="mailto:"]').first().text().trim());
        const website = $el.find('a.website-link, a[target="_blank"]').first().attr('href') || undefined;

        leads.push({
          businessName,
          phone,
          email:   email   || undefined,
          address: address || '',
          city,
          category,
          source: 'sulekha',
          website: website && !website.includes('sulekha.com') ? website : undefined,
        });
      } catch (_) {
        // skip malformed entry
      }
    });

    logger.debug('[SulekhaScraper] Parsed ' + leads.length + ' leads');
    return leads;
  }
}

module.exports = new SulekhaScraper();
