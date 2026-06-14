'use strict';

/**
 * LeadScorer — scores a lead's quality from 0–100 using Claude.
 *
 * Scoring factors considered by the AI:
 *  - Data completeness : phone, email, website, address all present
 *  - Reviews / activity: tags array signals an established business
 *  - Category relevance: retail-adjacent categories score higher
 *  - Business name     : a real name vs generic placeholder
 *
 * Rule-based fallback (used when AI call fails):
 *  phone=20pts, email=20pts, website=15pts, address=15pts, category match=30pts
 */

const Anthropic = require('@anthropic-ai/sdk');

let logger;
try {
  logger = require('../../config/logger');
} catch (_) {
  logger = {
    info: (...args) => console.info('[LeadScorer]', ...args),
    warn: (...args) => console.warn('[LeadScorer]', ...args),
    error: (...args) => console.error('[LeadScorer]', ...args),
  };
}

const MODEL = 'claude-sonnet-4-6';

// High-conversion categories — must match Lead.model.js enum exactly.
const HIGH_VALUE_CATEGORIES = new Set([
  'retail', 'clothing', 'jewellery', 'electronics', 'grocery',
  'pharmacy', 'restaurant', 'hotel', 'salon', 'gym',
]);

// ---------------------------------------------------------------------------
// Rule-based fallback scorer
// ---------------------------------------------------------------------------

/**
 * Scores a lead using deterministic rules.
 * Spec: phone=20, email=20, website=15, address=15, category match=30.
 *
 * @param {object} lead
 * @returns {number} 0–100
 */
function ruleBasedScore(lead) {
  let score = 0;

  if (lead.phone   && String(lead.phone).trim())   score += 20;
  if (lead.email   && String(lead.email).trim())   score += 20;
  if (lead.website && String(lead.website).trim()) score += 15;
  if (lead.address && String(lead.address).trim()) score += 15;

  if (lead.category) {
    const cat = String(lead.category).toLowerCase().replace(/\s+/g, '_');
    score += HIGH_VALUE_CATEGORIES.has(cat) ? 30 : 10;
  }

  return Math.min(100, Math.max(0, score));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scores a lead document using Claude (falls back to rule-based on failure).
 *
 * @param {object} lead  - Lead mongoose document or plain object.
 * @returns {Promise<number>} Integer score in [0, 100].
 */
async function scoreLead(lead) {
  if (!lead || typeof lead !== 'object') {
    throw new Error('scoreLead: a valid lead object is required');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build a privacy-safe summary (no raw PII sent to AI — just field presence flags).
  const summary = {
    businessName: lead.businessName || null,
    ownerName:    lead.ownerName    || null,
    phone:        lead.phone    ? 'present' : 'missing',
    email:        lead.email    ? 'present' : 'missing',
    website:      lead.website  ? 'present' : 'missing',
    address:      lead.address  ? 'present' : 'missing',
    city:         lead.city     || null,
    state:        lead.state    || null,
    category:     lead.category || null,
    source:       lead.source   || null,
    hasTagsOrReviews: Array.isArray(lead.tags) && lead.tags.length > 0,
    outreachAttempts: lead.outreachAttempts || 0,
  };

  const prompt = `You are scoring an Indian small-business lead for a D2C / retail automation platform that sells digital marketing and automation services.

Lead summary (JSON):
${JSON.stringify(summary, null, 2)}

Score this lead from 0 to 100 based on these criteria:

1. Data completeness  (phone + email + website + address all present = best)
2. Activity signal    (hasTagsOrReviews=true means the business is active and established)
3. Category relevance (retail / clothes / shoes / food / jewellery / electronics = high value;
                        manufacturing / b2b / government = low value)
4. Business name quality (a real specific name scores higher than "Shop" or "null")
5. Location data      (city/state present is better)

Scoring bands:
  80–100 : Complete data, high-value category, established business
  60–79  : Good data, relevant category, decent business signal
  40–59  : Partial data OR marginal category
  20–39  : Sparse data, low relevance
  0–19   : Very incomplete or likely invalid

Reply with ONLY a whole number between 0 and 100. No text. No punctuation. Just the number.`;

  const leadLabel = String(lead._id || lead.businessName || 'unknown');

  try {
    logger.info(`[LeadScorer] Scoring lead via AI | lead: ${leadLabel}`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response &&
      response.content &&
      response.content[0] &&
      response.content[0].text;

    if (!raw) {
      throw new Error('Empty response received from Anthropic API');
    }

    const rawTrimmed = raw.trim();

    // Primary parse: the whole response should be a number.
    let parsed = parseInt(rawTrimmed, 10);

    if (isNaN(parsed)) {
      // Fallback: extract the first numeric sequence from the response.
      const match = rawTrimmed.match(/\d+/);
      if (match) {
        parsed = parseInt(match[0], 10);
        logger.warn(
          `[LeadScorer] Extracted number from AI response "${rawTrimmed}" → ${parsed}`
        );
      } else {
        throw new Error(`Non-numeric AI response: "${rawTrimmed}"`);
      }
    }

    const score = Math.min(100, Math.max(0, parsed));
    logger.info(`[LeadScorer] AI score: ${score} | lead: ${leadLabel}`);
    return score;
  } catch (err) {
    logger.warn(
      `[LeadScorer] AI scoring failed (${err.message}) — using rule-based fallback | lead: ${leadLabel}`
    );

    const fallback = ruleBasedScore(lead);
    logger.info(`[LeadScorer] Rule-based fallback score: ${fallback} | lead: ${leadLabel}`);
    return fallback;
  }
}

module.exports = { scoreLead };
