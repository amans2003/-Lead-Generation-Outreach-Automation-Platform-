'use strict';

/**
 * TradeindiaScraper — scrapes business listings from tradeindia.com
 *
 * Strategy: Axios + Cheerio
 * URL: https://www.tradeindia.com/search/?search_string={keyword}&city={city}&page={page}
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

class TradeindiaScraper extends BaseScraper {
  constructor() { super('tradeindia'); }

  async scrape({ city, category, page = 1 }) {
    const keyword = this._pickKeyword(category);
    const params  = new URLSearchParams({
      search_string: keyword,
      city,
      page: String(page),
    });

    const url = `https://www.tradeindia.com/search/?${params.toString()}`;
    logger.debug('[TradeindiaScraper] Fetching ' + url);

    try {
      await this.randomDelay(1500, 3000);

      const response = await axios.get(url, {
        headers: {
          'User-Agent':      this.getRandomUserAgent(),
          'Accept':          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Referer':         'https://www.tradeindia.com/',
        },
        timeout: 20_000,
      });

      return this._parse(response.data, city, category);

    } catch (err) {
      logger.warn('[TradeindiaScraper] Request failed', { url, error: err.message });
      return [];
    }
  }

  _pickKeyword(category) {
    const kws = CATEGORY_KEYWORDS[category];
    if (!kws || kws.length === 0) return category.replace(/_/g, ' ');
    return kws[Math.floor(Math.random() * kws.length)];
  }

  _parse(html, city, category) {
    const $ = cheerio.load(html);
    const leads = [];

    // TradeIndia uses a standard card layout
    $('.card, .search-result-card, .company-details, [class*="CompanyBox"]').each((_, el) => {
      try {
        const $el = $(el);

        const businessName = $el.find('h3, .company-name, .firm-name, h2').first().text().trim();
        if (!businessName) return;

        const phoneRaw = $el.find('.phone, .tel, [href^="tel:"]').first().text().trim()
          || $el.find('[href^="tel:"]').first().attr('href')?.replace('tel:', '');

        const phone = this.extractPhone(phoneRaw);
        if (!phone) return;

        const address = $el.find('.address, .location').first().text().trim();
        const email   = this.extractEmail(
          $el.find('.email, [href^="mailto:"]').first().attr('href')?.replace('mailto:', '') || ''
        );
        const website = $el.find('a.web, a[target="_blank"]').not('[href*="tradeindia.com"]')
          .first().attr('href');

        leads.push({
          businessName,
          phone,
          email:   email   || undefined,
          address: address || '',
          city,
          category,
          source: 'tradeindia',
          website: website || undefined,
        });
      } catch (_) {
        // skip
      }
    });

    logger.debug('[TradeindiaScraper] Parsed ' + leads.length + ' leads');
    return leads;
  }
}

module.exports = new TradeindiaScraper();
