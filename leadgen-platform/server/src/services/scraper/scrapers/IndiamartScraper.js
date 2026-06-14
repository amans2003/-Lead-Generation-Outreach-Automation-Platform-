'use strict';

/**
 * IndiamartScraper — scrapes supplier/business listings from indiamart.com
 *
 * Strategy: Puppeteer stealth (IndiaMART renders results with JS).
 * URL: https://dir.indiamart.com/search.mp4?ss={keyword}&cq={city}
 */

const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

class IndiamartScraper extends BaseScraper {
  constructor() { super('indiamart'); }

  async scrape({ city, category, page = 1 }) {
    const keyword = this._pickKeyword(category);
    const params  = new URLSearchParams({
      ss:    keyword,
      cq:    city,
      biz:   'def',
      prefs: 'f:G',
    });
    if (page > 1) params.set('start', String((page - 1) * 25 + 1));

    const url = `https://dir.indiamart.com/search.mp?${params.toString()}`;
    logger.debug('[IndiamartScraper] Fetching ' + url);

    try {
      await this.launchBrowser();
      const pg = await this.newPage();
      await this.randomDelay(500, 1000); // let frame initialize before navigating
      await this.navigate(pg, url);

      await pg.waitForSelector('.companyname, .lcname, .bx, .p-company-name', { timeout: 20_000 }).catch(() => {});
      await this.randomDelay(2000, 3500);

      const leads = await pg.evaluate((cityArg, catArg) => {
        const items = document.querySelectorAll('.bx, .product-box, .prod-box, li[data-qs]');
        const result = [];

        items.forEach((el) => {
          try {
            const name = (
              el.querySelector('.companyname, .lcname, .p-company-name, .m-company-name') || {}
            ).textContent?.trim();

            const phoneEl = el.querySelector('[href^="tel:"]');
            const phone = phoneEl
              ? phoneEl.getAttribute('href').replace('tel:', '').replace(/\D/g, '').slice(-10)
              : (el.querySelector('.m-phone, .p-phone, .contact-dtls') || {}).textContent?.trim();

            const address = (
              el.querySelector('.city, .lcity, .address-dtls, .p-city') || {}
            ).textContent?.trim();

            const websiteEl = el.querySelector('a.website-btn, a[href*="http"]:not([href*="indiamart"])');
            const website = websiteEl ? websiteEl.href : undefined;

            if (name) {
              result.push({
                businessName: name,
                phone:        phone || null,
                address:      address || '',
                city:         cityArg,
                category:     catArg,
                source:       'indiamart',
                website,
              });
            }
          } catch (_) {}
        });
        return result;
      }, city, category);

      return leads.filter((l) => l.businessName);

    } catch (err) {
      logger.warn('[IndiamartScraper] Failed', { city, category, error: err.message });
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  _pickKeyword(category) {
    const kws = CATEGORY_KEYWORDS[category];
    if (!kws || kws.length === 0) return category.replace(/_/g, ' ');
    return kws[Math.floor(Math.random() * kws.length)];
  }
}

module.exports = new IndiamartScraper();
