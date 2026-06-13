'use strict';

/**
 * GoogleMapsScraper — scrapes business info from Google Maps search results.
 *
 * Strategy: Puppeteer stealth. Searches "{keyword} in {city}", waits for the
 * results panel, then extracts info from listing cards.
 *
 * Note: Google actively fights scraping. This uses stealth mode, random delays,
 * and limits results per query to stay below detection thresholds.
 */

const BaseScraper = require('./BaseScraper');
const { CATEGORY_KEYWORDS } = require('../../../utils/constants');

let logger;
try { logger = require('../../../config/logger'); }
catch (_) { logger = console; }

const MAPS_BASE = 'https://www.google.com/maps/search/';

class GoogleMapsScraper extends BaseScraper {
  constructor() { super('google_maps'); }

  async scrape({ city, category, page = 1 }) {
    const keyword = this._pickKeyword(category);
    const query   = encodeURIComponent(`${keyword} in ${city}`);
    const url     = `${MAPS_BASE}${query}`;

    logger.debug('[GoogleMapsScraper] Searching: ' + keyword + ' in ' + city);

    let page_ = null;
    try {
      await this.launchBrowser();
      page_ = await this.newPage();

      await this.navigate(page_, url);
      await this.randomDelay(3000, 5000);

      // Wait for result panel
      await page_.waitForSelector('[role="feed"], .m6QErb', { timeout: 20_000 }).catch(() => {});

      // Scroll down the panel to load more results
      const scrollCount = Math.min(page * 3, 12); // scale scrolls with page
      await this._scrollResultsPanel(page_, scrollCount);

      const leads = await this._extractLeads(page_, city, category);
      return leads;

    } catch (err) {
      logger.warn('[GoogleMapsScraper] Failed', { city, category, error: err.message });
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _pickKeyword(category) {
    const kws = CATEGORY_KEYWORDS[category];
    if (!kws || kws.length === 0) return category.replace(/_/g, ' ');
    return kws[Math.floor(Math.random() * kws.length)];
  }

  async _scrollResultsPanel(page_, times) {
    for (let i = 0; i < times; i++) {
      await page_.evaluate(() => {
        const feed = document.querySelector('[role="feed"]') || document.querySelector('.m6QErb');
        if (feed) feed.scrollTop += 800;
      });
      await this.randomDelay(1200, 2500);
    }
  }

  async _extractLeads(page_, city, category) {
    // Click each listing card to open the detail panel and extract phone/email
    const cardHandles = await page_.$$('[role="feed"] a[href*="/maps/place/"], .Nv2PK');
    const leads = [];

    // Cap at 20 per page to avoid long sessions
    const limit = Math.min(cardHandles.length, 20);

    for (let i = 0; i < limit; i++) {
      try {
        const card = cardHandles[i];
        await card.click().catch(() => {});
        await this.randomDelay(2000, 3500);

        // Wait for detail panel
        await page_.waitForSelector('.rogA2c, [data-section-id="oh"], .lfPIob', {
          timeout: 10_000,
        }).catch(() => {});

        const lead = await page_.evaluate((cityArg, catArg) => {
          const getText = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.textContent.trim() : '';
          };
          const getAttr = (sel, attr) => {
            const el = document.querySelector(sel);
            return el ? el.getAttribute(attr) || '' : '';
          };

          const name    = getText('h1.DUwDvf, h1.fontHeadlineLarge');
          const phone   = getText('.rogA2c, [data-tooltip="Copy phone number"] + .Io6YTe')
                        || getAttr('[data-section-id="pn0"] [href^="tel:"]', 'href').replace('tel:', '');
          const address = getText('.rogA2c:first-child, .LrzXr');
          const website = getAttr('a[data-section-id="ap"]', 'href')
                        || getAttr('a[aria-label*="Website"]', 'href');

          return {
            businessName: name || null,
            phone:        phone || null,
            address:      address || '',
            website:      website && !website.includes('google.com') ? website : undefined,
            city:         cityArg,
            category:     catArg,
            source:       'google_maps',
          };
        }, city, category);

        if (lead.businessName && lead.phone) {
          leads.push(lead);
        }

      } catch (_) {
        // skip card on any error
      }

      // Go back to list after extracting details
      await page_.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.randomDelay(1000, 2000);
    }

    logger.debug('[GoogleMapsScraper] Extracted ' + leads.length + ' leads');
    return leads;
  }
}

module.exports = new GoogleMapsScraper();
