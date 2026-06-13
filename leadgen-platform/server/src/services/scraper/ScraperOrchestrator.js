'use strict';

/**
 * ScraperOrchestrator
 *
 * Drives the full daily scrape pipeline:
 *  1. Fetches a query-rotation plan from ScrapedQuery (source x city x category x page
 *     combos that have not been scraped today).
 *  2. Runs all scrapers in parallel via Promise.allSettled.
 *  3. Deduplicates each raw lead batch through DedupService.checkPhone().
 *  4. Persists only net-new leads to MongoDB and registers them in the SeenLead registry.
 *  5. Emits Socket.io progress events every SCRAPER_BATCH_SIZE leads.
 *  6. Keeps looping until SCRAPER_DAILY_TARGET net-new leads are saved.
 *  7. Rotates to the next query batch when the current combos are exhausted.
 *  8. Finalises the ScraperJob document with cumulative stats.
 *  9. Enqueues all today new leads into the outreach pipeline.
 */

const dayjs = require('dayjs');
const Lead = require('../../models/Lead.model');
const ScrapedQuery = require('../../models/ScrapedQuery.model');
const ScraperJob = require('../../models/ScraperJob.model');
const logger = require('../../config/logger');
const env = require('../../config/env');
const { SOURCES, TARGET_CITIES, CATEGORIES } = require('../../utils/constants');

// Shared Socket.io instance - set via ScraperOrchestrator.setIO(io)
let _io = null;

// Lazy getters to avoid circular-require at module load time
function getDedupService() {
  return require('../dedup/DedupService'); // eslint-disable-line global-require
}

function getOutreachOrchestrator() {
  return require('../outreach/OutreachOrchestrator'); // eslint-disable-line global-require
}

// Per-source scraper registry
// Each scraper module must export: async scrape({ source, city, category, page }) => Lead[]
const SCRAPER_MAP = {
  justdial:    () => require('./scrapers/JustDialScraper'),     // eslint-disable-line global-require
  sulekha:     () => require('./scrapers/SulekhaScraper'),      // eslint-disable-line global-require
  google_maps: () => require('./scrapers/GoogleMapsScraper'),   // eslint-disable-line global-require
  indiamart:   () => require('./scrapers/IndiamartScraper'),    // eslint-disable-line global-require
  tradeindia:  () => require('./scrapers/TradeindiaScraper'),   // eslint-disable-line global-require
};

function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

function sleep(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ScraperOrchestrator {
  /**
   * Inject the Socket.io server so the orchestrator can emit real-time events.
   * Call once at app boot: ScraperOrchestrator.setIO(io)
   * @param {import('socket.io').Server} io
   */
  static setIO(io) {
    _io = io;
  }

  // ---------------------------------------------------------------------------
  // runDailyScrape
  // ---------------------------------------------------------------------------

  /**
   * Main entry-point. Run from a BullMQ worker or node-cron.
   * @param {string} jobId - MongoDB ObjectId of the ScraperJob document
   */
  async runDailyScrape(jobId) {
    const date = todayStr();
    logger.info('[ScraperOrchestrator] Starting daily scrape', { date, jobId });

    const job = await ScraperJob.findById(jobId);
    if (!job) throw new Error(`ScraperJob ${jobId} not found`);

    job.status = 'running';
    job.startedAt = new Date();
    job.targetCount = env.SCRAPER_DAILY_TARGET;
    await job.save();

    let totalNew = 0;
    let totalScraped = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    const sourceStats = {};
    const todayLeadIds = [];

    const dailyTarget = env.SCRAPER_DAILY_TARGET;
    const batchSize = env.SCRAPER_BATCH_SIZE;

    try {
      let continueLoop = true;

      // Outer loop - rotate through query batches until daily target is met
      while (continueLoop && totalNew < dailyTarget) {
        // 1. Get query plan for today
        let queryPlan = await this.getQueryPlan(date);

        if (!queryPlan || queryPlan.length === 0) {
          logger.info('[ScraperOrchestrator] All combos exhausted - rotating plan');
          await this.rotateQueryPlan();
          queryPlan = await this.getQueryPlan(date);

          if (!queryPlan || queryPlan.length === 0) {
            logger.warn('[ScraperOrchestrator] No queries available after rotation - stopping');
            continueLoop = false;
            break;
          }
        }

        // 2. Run all scrapers in parallel
        const scrapePromises = queryPlan.map((q) => this._runSingleScraper(q));
        const results = await Promise.allSettled(scrapePromises);

        // 3-6. Process each result
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const queryItem = queryPlan[i];

          if (result.status === 'rejected') {
            totalErrors += 1;
            const errMsg = result.reason && result.reason.message
              ? result.reason.message
              : String(result.reason);
            logger.error('[ScraperOrchestrator] Scraper failed', {
              source: queryItem.source,
              city: queryItem.city,
              category: queryItem.category,
              page: queryItem.page,
              error: errMsg,
            });
            job.logs.push(
              'ERROR [' + queryItem.source + '/' + queryItem.city + '/' +
              queryItem.category + ' p' + queryItem.page + ']: ' + errMsg
            );
            await ScrapedQuery.findOneAndUpdate(
              { source: queryItem.source, city: queryItem.city, category: queryItem.category, page: queryItem.page },
              { lastScrapedAt: new Date(), exhausted: true },
              { upsert: true }
            );
            continue;
          }

          const rawLeads = result.value || [];
          totalScraped += rawLeads.length;
          sourceStats[queryItem.source] = (sourceStats[queryItem.source] || 0) + rawLeads.length;

          // Mark query as scraped
          await ScrapedQuery.findOneAndUpdate(
            { source: queryItem.source, city: queryItem.city, category: queryItem.category, page: queryItem.page },
            { lastScrapedAt: new Date(), exhausted: rawLeads.length === 0, $inc: { leadCount: rawLeads.length } },
            { upsert: true }
          );

          if (rawLeads.length === 0) continue;

          // 3. Dedup check via DedupService
          const dedupService = getDedupService();
          const newLeads = [];

          for (const rawLead of rawLeads) {
            if (!rawLead.phone) {
              totalDuplicates += 1;
              continue;
            }
            const isDuplicate = await dedupService.checkPhone(rawLead.phone);
            if (isDuplicate) {
              totalDuplicates += 1;
            } else {
              newLeads.push(rawLead);
            }
          }

          if (newLeads.length === 0) continue;

          // 4. Save new leads to MongoDB + register in SeenLead
          for (const leadData of newLeads) {
            try {
              const lead = await Lead.create({
                businessName: leadData.businessName,
                ownerName:    leadData.ownerName,
                phone:        leadData.phone,
                altPhone:     leadData.altPhone,
                email:        leadData.email,
                whatsapp:     leadData.whatsapp || leadData.phone,
                website:      leadData.website,
                address:      leadData.address,
                city:         leadData.city     || queryItem.city,
                state:        leadData.state,
                pincode:      leadData.pincode,
                category:     leadData.category || queryItem.category,
                source:       leadData.source   || queryItem.source,
                status:       'new',
                scrapedAt:    new Date(),
                scrapeDate:   date,
              });

              await dedupService.registerPhone(leadData.phone, queryItem.source);

              totalNew += 1;
              todayLeadIds.push(lead._id);

              // 5. Emit Socket.io progress every batchSize leads
              if (totalNew % batchSize === 0) {
                this._emitProgress({
                  jobId, date, totalNew, totalScraped, totalDuplicates,
                  totalErrors, target: dailyTarget, sourceStats: Object.assign({}, sourceStats),
                });
              }

              // 6. Stop when daily target is met
              if (totalNew >= dailyTarget) {
                continueLoop = false;
                break;
              }
            } catch (saveErr) {
              if (saveErr.code === 11000) {
                totalDuplicates += 1;
              } else {
                totalErrors += 1;
                logger.error('[ScraperOrchestrator] Failed to save lead', {
                  phone: leadData.phone,
                  error: saveErr.message,
                });
              }
            }
          }

          // Brief delay between batches
          await sleep(env.SCRAPER_DELAY_MIN_MS, env.SCRAPER_DELAY_MAX_MS);
        }
      }

      // 8. Finalise job document
      job.status      = totalNew >= dailyTarget ? 'completed' : 'partial';
      job.scrapedCount   = totalScraped;
      job.newCount       = totalNew;
      job.duplicateCount = totalDuplicates;
      job.errorCount     = totalErrors;
      job.sourceStats    = sourceStats;
      job.completedAt    = new Date();
      job.logs.push(
        'Done: ' + totalNew + ' new / ' + totalScraped + ' scraped / ' +
        totalDuplicates + ' dupes / ' + totalErrors + ' errors'
      );
      await job.save();

      // Final progress event
      this._emitProgress({
        jobId, date, totalNew, totalScraped, totalDuplicates,
        totalErrors, target: dailyTarget,
        sourceStats: Object.assign({}, sourceStats), done: true,
      });

      logger.info('[ScraperOrchestrator] Daily scrape complete', {
        date, totalNew, totalScraped, totalDuplicates, totalErrors,
      });

      // 9. Trigger outreach queue for today's new leads
      if (todayLeadIds.length > 0) {
        await this._triggerOutreach(todayLeadIds);
      }

      return { success: true, totalNew, totalScraped, totalDuplicates, totalErrors, sourceStats };

    } catch (fatalErr) {
      logger.error('[ScraperOrchestrator] Fatal error', {
        error: fatalErr.message,
        stack: fatalErr.stack,
      });
      job.status = 'failed';
      job.completedAt = new Date();
      job.logs.push('FATAL: ' + fatalErr.message);
      await job.save();
      throw fatalErr;
    }
  }

  // ---------------------------------------------------------------------------
  // getQueryPlan
  // ---------------------------------------------------------------------------

  /**
   * Returns combos not yet scraped today (lastScrapedAt < today's midnight, exhausted=false).
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<Array<{source:string,city:string,category:string,page:number}>>}
   */
  async getQueryPlan(date) {
    const startOfDay = dayjs(date).startOf('day').toDate();

    const alreadyScraped = await ScrapedQuery.find({
      $or: [
        { lastScrapedAt: { $gte: startOfDay } },
        { exhausted: true },
      ],
    }).select('source city category page').lean();

    const scrapedKeys = new Set(
      alreadyScraped.map((q) => q.source + '|' + q.city + '|' + q.category + '|' + q.page)
    );

    const cities = (env.SCRAPER_TARGET_CITIES && env.SCRAPER_TARGET_CITIES.length > 0)
      ? env.SCRAPER_TARGET_CITIES
      : TARGET_CITIES;

    const activeSources = Object.keys(SCRAPER_MAP);
    const candidates = [];

    for (const source of activeSources) {
      for (const city of cities) {
        for (const category of CATEGORIES) {
          const key = source + '|' + city + '|' + category + '|1';
          if (!scrapedKeys.has(key)) {
            candidates.push({ source, city, category, page: 1 });
          }
        }
      }
    }

    // Shuffle for variety
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }

    return candidates.slice(0, env.SCRAPER_CONCURRENT_TABS);
  }

  // ---------------------------------------------------------------------------
  // rotateQueryPlan
  // ---------------------------------------------------------------------------

  /**
   * Generates next-page entries for productive queries and resets exhausted flags
   * so the scraper can continue scraping deeper pages.
   */
  async rotateQueryPlan() {
    logger.info('[ScraperOrchestrator] Rotating query plan to next page cycle');

    const productiveQueries = await ScrapedQuery.find({ leadCount: { $gt: 0 } }).lean();

    const bulkOps = productiveQueries.map((q) => ({
      updateOne: {
        filter: { source: q.source, city: q.city, category: q.category, page: q.page + 1 },
        update: {
          $setOnInsert: {
            source:    q.source,
            city:      q.city,
            category:  q.category,
            page:      q.page + 1,
            exhausted: false,
            leadCount: 0,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await ScrapedQuery.bulkWrite(bulkOps, { ordered: false });
    }

    // Reset exhausted flag so retries are possible
    await ScrapedQuery.updateMany(
      { exhausted: true },
      { $set: { exhausted: false, lastScrapedAt: null } }
    );

    logger.info(
      '[ScraperOrchestrator] Rotation complete: ' + bulkOps.length + ' next-page entries queued'
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Executes the scraper for one query combo.
   * @private
   */
  async _runSingleScraper({ source, city, category, page }) {
    const scraperLoader = SCRAPER_MAP[source];
    if (!scraperLoader) {
      logger.warn('[ScraperOrchestrator] No scraper for source: ' + source);
      return [];
    }
    const scraper = scraperLoader();
    logger.debug(
      '[ScraperOrchestrator] Scraping ' + source + ' | ' + city + ' | ' + category + ' | p' + page
    );
    const leads = await scraper.scrape({ source, city, category, page });
    logger.debug(
      '[ScraperOrchestrator] ' + source + '/' + city + '/' + category + '/p' + page +
      ' -> ' + (Array.isArray(leads) ? leads.length : 0) + ' raw leads'
    );
    return Array.isArray(leads) ? leads : [];
  }

  /**
   * Broadcasts a scraper:progress Socket.io event.
   * @private
   */
  _emitProgress(payload) {
    if (_io) {
      _io.emit('scraper:progress', payload);
    }
  }

  /**
   * Enqueues new leads into the outreach pipeline for the first active campaign.
   * @private
   * @param {import('mongoose').Types.ObjectId[]} leadIds
   */
  async _triggerOutreach(leadIds) {
    try {
      const Campaign = require('../../models/Campaign.model'); // eslint-disable-line global-require
      const outreachOrchestrator = getOutreachOrchestrator();

      const activeCampaign = await Campaign.findOne({ status: 'active' }).lean();
      if (!activeCampaign) {
        logger.info('[ScraperOrchestrator] No active campaign - skipping outreach queue');
        return;
      }

      logger.info(
        '[ScraperOrchestrator] Queueing ' + leadIds.length + ' leads for outreach',
        { campaignId: activeCampaign._id }
      );

      const OUTREACH_BATCH = 20;
      for (let i = 0; i < leadIds.length; i += OUTREACH_BATCH) {
        const batchIds = leadIds.slice(i, i + OUTREACH_BATCH);
        const leads = await Lead.find({ _id: { $in: batchIds } }).lean();
        await Promise.allSettled(
          leads.map((lead) =>
            outreachOrchestrator.processLead(lead, String(activeCampaign._id))
          )
        );
      }

      logger.info('[ScraperOrchestrator] Outreach queue population complete');
    } catch (err) {
      logger.error('[ScraperOrchestrator] Failed to trigger outreach', { error: err.message });
    }
  }
}

module.exports = new ScraperOrchestrator();
