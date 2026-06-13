'use strict';

/**
 * DedupService
 *
 * Three-layer phone deduplication:
 *
 *  Layer 1 – Normalization  (PhoneNormalizer)
 *      Reject / canonicalize raw phone strings before any I/O.
 *
 *  Layer 2 – Bloom Filter   (BloomFilterService → Redis)
 *      O(1) probabilistic check with zero false-negatives.
 *      A "definitely not seen" answer skips the DB round-trip entirely.
 *
 *  Layer 3 – MongoDB        (SeenLead collection)
 *      Authoritative truth; resolves bloom-filter false positives.
 *
 * Exported as a singleton so the same instance (and its in-process state)
 * is shared across all callers.
 */

const crypto            = require('crypto');
const logger            = require('../../config/logger');
const PhoneNormalizer   = require('./PhoneNormalizer');
const BloomFilterService = require('./BloomFilterService');
const SeenLead          = require('../../models/SeenLead.model');

class DedupService {
  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Produce a deterministic hex SHA-256 hash for a normalized phone string.
   *
   * @param {string} normalizedPhone
   * @returns {string} 64-character lowercase hex digest
   */
  _hashPhone(normalizedPhone) {
    return crypto.createHash('sha256').update(normalizedPhone).digest('hex');
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Check whether a raw phone number has been seen before.
   *
   * @param {string|number} rawPhone
   * @returns {Promise<{ isNew: boolean, normalizedPhone: string|null, phoneHash: string|null }>}
   *   isNew:           true  → never seen before (safe to insert)
   *                    false → duplicate or invalid
   *   normalizedPhone: E.164 string, or null when normalization fails
   *   phoneHash:       hex SHA-256, or null when normalization fails
   */
  async checkPhone(rawPhone) {
    // ── Layer 1: Normalize ──────────────────────────────────────────────────
    const normalizedPhone = PhoneNormalizer.normalize(rawPhone);

    if (!normalizedPhone) {
      logger.debug('DedupService.checkPhone: invalid phone rejected', { rawPhone });
      return { isNew: false, normalizedPhone: null, phoneHash: null };
    }

    const phoneHash = this._hashPhone(normalizedPhone);

    // ── Layer 2: Bloom filter ───────────────────────────────────────────────
    const mightExist = await BloomFilterService.mightExist(phoneHash);

    if (!mightExist) {
      // Bloom filter guarantees this hash has never been added → definitely new
      logger.debug('DedupService.checkPhone: bloom filter miss – phone is new', { normalizedPhone });
      return { isNew: true, normalizedPhone, phoneHash };
    }

    // ── Layer 3: MongoDB authoritative check ────────────────────────────────
    // (Resolves bloom-filter false positives)
    const existing = await SeenLead.findOne({ phoneHash }).lean();

    if (existing) {
      logger.debug('DedupService.checkPhone: duplicate found in DB', {
        normalizedPhone,
        firstSeenAt: existing.firstSeenAt,
        source: existing.source,
      });
      return { isNew: false, normalizedPhone, phoneHash };
    }

    // Bloom false-positive — phone is actually new
    logger.debug('DedupService.checkPhone: bloom false-positive resolved – phone is new', {
      normalizedPhone,
    });
    return { isNew: true, normalizedPhone, phoneHash };
  }

  /**
   * Persist a phone hash so it is recognized as a duplicate on future checks.
   * Writes to both MongoDB (SeenLead) and the Bloom Filter.
   *
   * Idempotent: a duplicate call (same hash) will simply result in a no-op upsert.
   *
   * @param {string} phoneHash       - Hex SHA-256 of the normalized phone.
   * @param {string} normalizedPhone - E.164 phone string.
   * @param {string} [source]        - Scraper/source identifier (e.g. 'justdial').
   * @returns {Promise<void>}
   */
  async markAsSeen(phoneHash, normalizedPhone, source = 'unknown') {
    if (!phoneHash || !normalizedPhone) {
      logger.warn('DedupService.markAsSeen: called with missing hash or phone – skipping');
      return;
    }

    try {
      // Upsert into MongoDB so the record is durable across restarts
      await SeenLead.updateOne(
        { phoneHash },
        {
          $setOnInsert: {
            phoneHash,
            phone:       normalizedPhone,
            source,
            firstSeenAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (err) {
      // Duplicate-key errors are harmless (race between two concurrent scrapers)
      if (err.code !== 11000) {
        logger.error('DedupService.markAsSeen: MongoDB upsert failed', {
          error:   err.message,
          phoneHash,
        });
      }
    }

    // Also add to bloom filter so subsequent checks are O(1)
    await BloomFilterService.add(phoneHash);

    logger.debug('DedupService.markAsSeen: recorded', { normalizedPhone, source });
  }

  /**
   * Bulk-check an array of raw phone strings, returning only the ones that are
   * genuinely new (never seen before).
   *
   * @param {Array<string|number>} rawPhones
   * @returns {Promise<Array<{ normalizedPhone: string, phoneHash: string }>>}
   *   Only the entries that passed all three dedup layers.
   */
  async filterNewPhones(rawPhones) {
    if (!Array.isArray(rawPhones) || rawPhones.length === 0) return [];

    // Step 1 – Normalize everything; discard invalid entries
    const candidates = rawPhones.reduce((acc, raw) => {
      const normalizedPhone = PhoneNormalizer.normalize(raw);
      if (normalizedPhone) {
        const phoneHash = this._hashPhone(normalizedPhone);
        acc.push({ normalizedPhone, phoneHash });
      }
      return acc;
    }, []);

    if (candidates.length === 0) return [];

    // Step 2 – Bloom filter: keep only those the filter says might be new
    // We check each individually; BF.MEXISTS would be cleaner but adds complexity
    // for marginal gain here.
    const bloomNewCandidates = [];
    const bloomMaybeSeen     = [];

    for (const candidate of candidates) {
      const mightExist = await BloomFilterService.mightExist(candidate.phoneHash);
      if (mightExist) {
        bloomMaybeSeen.push(candidate);
      } else {
        bloomNewCandidates.push(candidate);
      }
    }

    // Step 3 – For bloom "maybe-seen" entries, verify against MongoDB
    let dbVerifiedNew = [];
    if (bloomMaybeSeen.length > 0) {
      const hashes = bloomMaybeSeen.map((c) => c.phoneHash);
      const existingDocs = await SeenLead.find(
        { phoneHash: { $in: hashes } },
        { phoneHash: 1 }
      ).lean();

      const seenSet = new Set(existingDocs.map((d) => d.phoneHash));

      dbVerifiedNew = bloomMaybeSeen.filter((c) => !seenSet.has(c.phoneHash));
    }

    const newPhones = [...bloomNewCandidates, ...dbVerifiedNew];

    logger.debug('DedupService.filterNewPhones: bulk check complete', {
      input:     rawPhones.length,
      valid:     candidates.length,
      new:       newPhones.length,
      duplicate: candidates.length - newPhones.length,
    });

    return newPhones;
  }

  /**
   * Return aggregate deduplication statistics.
   *
   * @returns {Promise<{ totalSeen: number, todayDuplicates: number }>}
   *   totalSeen:       total documents in the SeenLead collection
   *   todayDuplicates: SeenLead documents created today (UTC) – a proxy for
   *                    how many phones were rejected as duplicates today
   */
  async getStats() {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [totalSeen, todayDuplicates] = await Promise.all([
      SeenLead.countDocuments(),
      SeenLead.countDocuments({ firstSeenAt: { $gte: startOfToday } }),
    ]);

    return { totalSeen, todayDuplicates };
  }
}

// Export as a singleton so state is shared across the process
module.exports = new DedupService();
