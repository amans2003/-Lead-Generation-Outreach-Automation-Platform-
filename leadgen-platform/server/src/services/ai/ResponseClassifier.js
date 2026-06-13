'use strict';

/**
 * ResponseClassifier — classifies an inbound reply from a business lead into
 * one of three labels using Claude:
 *
 *   good_lead      – interested, wants more info, open to further contact
 *   not_interested – explicitly rejecting, asking to stop messages
 *   processing     – neutral / unclear / needs more follow-up context
 *
 * Falls back to a rule-based classifier if the AI call fails.
 */

const Anthropic = require('@anthropic-ai/sdk');

let logger;
try {
  logger = require('../../config/logger');
} catch (_) {
  logger = {
    info: (...args) => console.info('[ResponseClassifier]', ...args),
    warn: (...args) => console.warn('[ResponseClassifier]', ...args),
    error: (...args) => console.error('[ResponseClassifier]', ...args),
  };
}

const MODEL        = 'claude-sonnet-4-6';
const VALID_LABELS = ['good_lead', 'not_interested', 'processing'];

// ---------------------------------------------------------------------------
// Rule-based fallback
// ---------------------------------------------------------------------------

const NOT_INTERESTED_PATTERNS = [
  'not interested', 'no thanks', 'no thank you',
  'nahi chahiye', 'nahi', 'nahin',
  'stop', 'unsubscribe', 'remove me', 'please remove',
  'do not contact', "don't contact", 'block',
  'band karo', 'mat bhejo', 'mujhe mat bhejo',
  'delete', 'spam', 'wrong number',
];

const GOOD_LEAD_PATTERNS = [
  'interested', 'tell me more', 'more details', 'aur batao',
  'price', 'pricing', 'cost', 'kitna', 'how much',
  'demo', 'free demo', 'call me', 'call karo', 'call karein',
  'contact me', 'yes', 'haan', 'ok', 'okay', 'sure', 'great',
  'sounds good', 'please share', 'send details', 'details bhejo',
  'want', 'chahiye', 'meeting', 'discuss', 'baat karte hain',
  'when can', 'available', 'when are you',
];

/**
 * Simple keyword-based classifier — used as a fallback.
 * @param {string} text
 * @returns {'good_lead' | 'not_interested' | 'processing'}
 */
function ruleBasedClassify(text) {
  const lower = (text || '').toLowerCase();

  for (const pattern of NOT_INTERESTED_PATTERNS) {
    if (lower.includes(pattern)) return 'not_interested';
  }

  for (const pattern of GOOD_LEAD_PATTERNS) {
    if (lower.includes(pattern)) return 'good_lead';
  }

  return 'processing';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classifies a lead's response text using Claude.
 *
 * @param {string} responseText  - The raw reply received from the business.
 * @returns {Promise<'good_lead' | 'not_interested' | 'processing'>}
 */
async function classifyResponse(responseText) {
  // Guard against empty / invalid input early.
  if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
    logger.warn('[ResponseClassifier] Received empty / non-string responseText — returning "processing"');
    return 'processing';
  }

  const sanitized = responseText.trim();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Classify the following reply from an Indian business owner to a sales outreach message.

Reply: "${sanitized}"

Choose EXACTLY ONE label:
- good_lead       (they are interested, want info, open to talking)
- not_interested  (clearly rejecting, asking to stop, not needed)
- processing      (neutral, unclear, needs more context)

Reply with ONLY the label. No punctuation. No explanation. Just the label.`;

  try {
    logger.info('[ResponseClassifier] Sending response for AI classification');

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

    // Normalise: lowercase, strip everything except letters and underscores.
    const normalised = raw.trim().toLowerCase().replace(/[^a-z_]/g, '');

    if (VALID_LABELS.includes(normalised)) {
      logger.info(`[ResponseClassifier] AI label: "${normalised}"`);
      return normalised;
    }

    // Try partial match in case the model added extra words (e.g. "good_lead.")
    for (const label of VALID_LABELS) {
      if (normalised.includes(label.replace(/_/g, ''))) {
        logger.warn(
          `[ResponseClassifier] Fuzzy-matched AI output "${normalised}" → "${label}"`
        );
        return label;
      }
    }

    // AI returned something unexpected — fall through to rule-based.
    logger.warn(
      `[ResponseClassifier] Unexpected AI output "${normalised}", using rule-based fallback`
    );
    return ruleBasedClassify(sanitized);
  } catch (err) {
    logger.error(
      `[ResponseClassifier] AI classification failed: ${err.message} — using rule-based fallback`
    );
    return ruleBasedClassify(sanitized);
  }
}

module.exports = { classifyResponse };
