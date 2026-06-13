'use strict';

/**
 * JustDialScraper — scrapes business listings from justdial.com
 *
 * Strategy: Axios + Cheerio (no headless browser needed for most queries).
 * Falls back to Puppeteer if the static response is empty (JS-rendered).
 *
 * URL pattern: https://www.justdial.com/{city}/{category}/{page}-page
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

class JustDialScraper extends BaseScraper {
  constructor() { super('justdial'); }

  /**
   * @param {{ source: string, city: string, category: string, page: number }} opts
   * @returns {Promise<object[]>}
   */
  async scrape({ city, category, page = 1 }) {
    const keyword = this._pickKeyword(category);
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const keySlug  = keyword.toLowerCase().replace(/\s+/g, '-');

    // JustDial URL: /Mumbai/shoe-stores/nct-110005/page-2
    const pageStr = page > 1 ? `/page-${page}` : '';
    const url = `https://www.justdial.com/${city}/${keySlug}${pageStr}`;

    logger.debug('[JustDialScraper] Fetching ' + url);

    try {
      await this.randomDelay(2000, 4000);

      const response = await axios.get(url, {
        headers: {
          'User-Agent':      this.getRandomUserAgent(),
          'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer':         'https://www.justdial.com/',
          'Connection':      'keep-alive',
        },
        timeout: 20_000,
      });

      return this._parseHTML(response.data, city, category);

    } catch (err) {
      logger.warn('[JustDialScraper] Axios failed, trying Puppeteer fallback', {
        url,
        error: err.message,
      });
      return this._puppeteerFallback(url, city, category);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _pickKeyword(category) {
    const kws = CATEGORY_KEYWORDS[category];
    if (!kws || kws.length === 0) return category.replace(/_/g, ' ');
    return kws[Math.floor(Math.random() * kws.length)];
  }

  _parseHTML(html, city, category) {
    const $ = cheerio.load(html);
    const leads = [];

    // JustDial wraps each listing in a <li class="cntanr"> or similar
    $('li.cntanr, .resultbox_info, [data-jtd-uid]').each((_, el) => {
      try {
        const $el = $(el);

        const businessName = $el.find('.fn, .resultbox_title_anchor, h2.fn').first().text().trim();
        if (!businessName) return;

        const phoneRaw = $el.find('.mobilesv, .callcontent, [data-phone]').first().attr('data-phone')
          || $el.find('.callcontent').first().text().trim();

        const phone = this.extractPhone(phoneRaw);
        if (!phone) return; // skip leads without phone

        const address = $el.find('.jdp_address_string, .address-info').first().text().trim();
        const website = $el.find('a[href*="http"]').filter((_, a) => {
          const href = $(a).attr('href') || '';
          return !href.includes('justdial.com');
        }).first().attr('href') || '';

        leads.push({
          businessName,
          phone,
          address: address || '',
          city,
          category,
          source: 'justdial',
          website: website || undefined,
        });
      } catch (_) {
        // skip malformed entries
      }
    });

    logger.debug('[JustDialScraper] Parsed ' + leads.length + ' leads from HTML');
    return leads;
  }

  async _puppeteerFallback(url, city, category) {
    try {
      await this.launchBrowser();
      const page = await this.newPage();
      await this.navigate(page, url);
      await page.waitForSelector('.cntanr, .resultbox_info', { timeout: 15_000 }).catch(() => {});

      const html = await page.content();
      await this.closeBrowser();
      return this._parseHTML(html, city, category);
    } catch (err) {
      logger.warn('[JustDialScraper] Puppeteer fallback also failed', { error: err.message });
      await this.closeBrowser();
      return [];
    }
  }
}

module.exports = new JustDialScraper();
