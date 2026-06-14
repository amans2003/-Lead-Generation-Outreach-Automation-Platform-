'use strict';

/**
 * TradeindiaScraper — scrapes business listings from tradeindia.com
 *
 * Strategy: Puppeteer stealth (TradeIndia is Next.js client-side rendered).
 * URL: https://www.tradeindia.com/search.html?search_string={keyword}&geo={city}
 */

const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

class TradeindiaScraper extends BaseScraper {
  constructor() { super('tradeindia'); }

  async scrape({ city, category, page = 1 }) {
    const keyword = this._pickKeyword(category);
    const params  = new URLSearchParams({ search_string: keyword, geo: city });
    if (page > 1) params.set('page', String(page));

    const url = `https://www.tradeindia.com/search.html?${params.toString()}`;
    logger.debug('[TradeindiaScraper] Fetching ' + url);

    try {
      await this.launchBrowser();
      const pg = await this.newPage();
      await this.randomDelay(500, 1000);
      await this.navigate(pg, url);

      await pg.waitForSelector(
        '[class*="CompanyCard"], [class*="SupplierCard"], [class*="company-card"], .company-name, [class*="companyName"]',
        { timeout: 20_000 }
      ).catch(() => {});
      await this.randomDelay(2000, 3000);

      const leads = await pg.evaluate((cityArg, catArg) => {
        const result = [];

        // TradeIndia uses CSS modules — class names are hashed but data-attributes are stable
        const cards = document.querySelectorAll(
          '[class*="CompanyCard"], [class*="SupplierCard"], [data-company-id], li[data-id]'
        );

        cards.forEach((el) => {
          try {
            const nameEl = el.querySelector(
              '[class*="companyName"], [class*="CompanyName"], [class*="company-name"], h2, h3'
            );
            const name = nameEl?.textContent?.trim();
            if (!name) return;

            const telEl = el.querySelector('[href^="tel:"]');
            const phone = telEl
              ? telEl.getAttribute('href').replace('tel:', '').replace(/\D/g, '').slice(-10)
              : null;

            const addrEl = el.querySelector('[class*="address"], [class*="Address"], [class*="location"]');
            const address = addrEl?.textContent?.trim() || '';

            const webEl = el.querySelector('a[href^="http"]:not([href*="tradeindia"])');
            const website = webEl ? webEl.href : undefined;

            result.push({ businessName: name, phone, address, city: cityArg, category: catArg, source: 'tradeindia', website });
          } catch (_) {}
        });
        return result;
      }, city, category);

      logger.debug('[TradeindiaScraper] Extracted ' + leads.length + ' leads');
      return leads.filter((l) => l.businessName);

    } catch (err) {
      logger.warn('[TradeindiaScraper] Failed', { city, category, error: err.message });
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

module.exports = new TradeindiaScraper();
