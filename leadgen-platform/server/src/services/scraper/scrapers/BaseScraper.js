'use strict';

/**
 * BaseScraper — shared functionality for all scraper implementations.
 *
 * Each concrete scraper must implement:
 *   async scrape({ source, city, category, page }) → Lead[]
 *
 * Where a Lead is a plain object matching the Lead model fields.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { getRandomUserAgent: _getRandomUA } = require('../../../utils/userAgentRotator');
const { retry } = require('../../../utils/retryHelper');

let logger;
try {
  logger = require('../../../config/logger');
} catch (_) {
  logger = {
    info: (...a) => console.info('[BaseScraper]', ...a),
    warn: (...a) => console.warn('[BaseScraper]', ...a),
    error: (...a) => console.error('[BaseScraper]', ...a),
    debug: (...a) => console.debug('[BaseScraper]', ...a),
  };
}

class BaseScraper {
  /** @param {string} sourceName - The source identifier, e.g. 'justdial' */
  constructor(sourceName) {
    this.sourceName = sourceName;
    this.browser    = null;
  }

  // ── Must override in subclass ──────────────────────────────────────────────

  /**
   * @param {{ source: string, city: string, category: string, page: number }} opts
   * @returns {Promise<object[]>} Array of raw lead objects
   */
  // eslint-disable-next-line no-unused-vars
  async scrape(opts) {
    throw new Error('[BaseScraper] scrape() must be implemented by ' + this.constructor.name);
  }

  // ── Shared utilities ──────────────────────────────────────────────────────

  /** Returns a random real-world User-Agent string. */
  getRandomUserAgent() {
    return _getRandomUA();
  }

  /** Waits a random number of ms between minMs and maxMs. */
  randomDelay(minMs = 2000, maxMs = 5000) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Launches a Puppeteer browser with stealth plugin enabled.
   * Stores the instance at `this.browser`.
   */
  async launchBrowser() {
    const puppeteer    = require('puppeteer-extra');           // eslint-disable-line global-require
    const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // eslint-disable-line global-require
    puppeteer.use(StealthPlugin());

    const headless = process.env.SCRAPER_HEADLESS !== 'false';

    // Prefer CHROME_EXECUTABLE env var, then scan cache for the newest build
    const executablePath = process.env.CHROME_EXECUTABLE || this._findChrome();

    this.browser = await puppeteer.launch({
      headless,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    });

    logger.debug('[BaseScraper] Browser launched', { source: this.sourceName });
    return this.browser;
  }

  /** Finds the newest Chrome for Testing binary in the puppeteer cache. */
  _findChrome() {
    const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
    if (!fs.existsSync(cacheDir)) return undefined;
    const builds = fs.readdirSync(cacheDir).sort().reverse(); // newest first
    for (const build of builds) {
      const bin = path.join(cacheDir, build, 'chrome-mac-arm64',
        'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
      if (fs.existsSync(bin)) return bin;
      // Linux path
      const linuxBin = path.join(cacheDir, build, 'chrome-linux64', 'chrome');
      if (fs.existsSync(linuxBin)) return linuxBin;
    }
    return undefined;
  }

  /** Closes the browser if open. */
  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (_) {
        // Ignore close errors
      }
      this.browser = null;
      logger.debug('[BaseScraper] Browser closed', { source: this.sourceName });
    }
  }

  /**
   * Creates a new Puppeteer page with a random UA and standard timeouts.
   * @returns {Promise<import('puppeteer').Page>}
   */
  async newPage() {
    if (!this.browser) await this.launchBrowser();
    const page = await this.browser.newPage();
    await page.setUserAgent(this.getRandomUserAgent());
    await page.setViewport({ width: 1280, height: 800 });
    page.setDefaultNavigationTimeout(30_000);
    page.setDefaultTimeout(20_000);
    return page;
  }

  /**
   * Navigates to a URL with retry on failure.
   * @param {import('puppeteer').Page} page
   * @param {string} url
   */
  async navigate(page, url) {
    await retry(
      () => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
      { retries: 2, delay: 3000, label: '[BaseScraper] navigate ' + url }
    );
  }

  /**
   * Extracts numbers from a string — useful for pulling phone numbers out of
   * dirty text like "Call: 098-765-4321 | Alt: 080-1234-5678".
   * Returns the first 10-digit sequence starting with 6-9.
   *
   * @param {string} text
   * @returns {string|null}
   */
  extractPhone(text) {
    if (!text) return null;
    const cleaned = String(text).replace(/\D/g, '');
    // Try 10-digit Indian mobile starting at digits 6-9
    const match = cleaned.match(/[6-9]\d{9}/);
    return match ? match[0] : null;
  }

  /**
   * Very basic email extractor from raw text.
   * @param {string} text
   * @returns {string|null}
   */
  extractEmail(text) {
    if (!text) return null;
    const match = String(text).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : null;
  }
}

module.exports = BaseScraper;
