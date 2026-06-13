'use strict';

/**
 * MessageGenerator — uses Claude to produce personalised outreach messages
 * for three channels: sms, email, whatsapp.
 *
 * Channel rules:
 *  - sms       : ≤160 chars, casual Hinglish (Hindi-English mix)
 *  - email     : professional subject + body
 *  - whatsapp  : conversational, exactly 4 lines
 *
 * Returns { subject?, message } — `subject` is only present for email.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { retry } = require('../../utils/retryHelper');

let logger;
try {
  logger = require('../../config/logger');
} catch (_) {
  logger = {
    info: (...args) => console.info('[MessageGenerator]', ...args),
    warn: (...args) => console.warn('[MessageGenerator]', ...args),
    error: (...args) => console.error('[MessageGenerator]', ...args),
  };
}

const MODEL = 'claude-sonnet-4-6';
const VALID_CHANNELS = ['sms', 'email', 'whatsapp'];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds a channel-specific prompt for the AI.
 * @param {object} lead
 * @param {string} channel  sms | email | whatsapp
 * @returns {string}
 */
function buildPrompt(lead, channel) {
  const lines = [];
  if (lead.businessName) lines.push(`Business Name: ${lead.businessName}`);
  if (lead.ownerName)    lines.push(`Owner: ${lead.ownerName}`);
  if (lead.category)     lines.push(`Category: ${lead.category}`);
  if (lead.city)         lines.push(`City: ${lead.city}`);
  if (lead.website)      lines.push(`Website: ${lead.website}`);

  const businessInfo = lines.length
    ? lines.join('\n')
    : 'No specific business details available.';

  switch (channel) {
    case 'sms':
      return `You are crafting a sales outreach SMS targeting an Indian small business owner.

Business info:
${businessInfo}

Write a casual, friendly SMS in Hinglish (natural mix of Hindi and English) to introduce our digital marketing and automation services.

Hard rules:
- Total length MUST be 160 characters or fewer (including spaces and punctuation)
- Casual tone — like texting a friend
- Mix Hindi and English naturally (e.g. "Aapka business grow kar sakte hain")
- End with a short call-to-action (e.g. reply Y, call karein, etc.)
- NO subject line

Reply with ONLY the SMS text. Nothing else. No quotes. No labels.`;

    case 'email':
      return `You are writing a professional sales outreach email targeting an Indian small business owner.

Business info:
${businessInfo}

Write an email to introduce our digital marketing and automation services.

Rules:
- Professional yet warm, approachable tone
- Personalise to their business/category where possible
- Subject line: compelling, concise (under 60 characters)
- Body: 3–4 short paragraphs, under 200 words total
- End with a clear call-to-action (book a free demo, reply to this email, etc.)

Reply in this EXACT format — no extra text, no markdown:
SUBJECT: <subject line>
BODY:
<email body>`;

    case 'whatsapp':
      return `You are writing a WhatsApp outreach message targeting an Indian small business owner.

Business info:
${businessInfo}

Write a conversational WhatsApp message to introduce our digital marketing and automation services.

Hard rules:
- EXACTLY 4 lines — no more, no less
- Friendly and conversational tone
- You may use 1–2 simple emojis (e.g. 👋 🚀) sparingly
- Mention their business/category where possible
- Last line must be a question that invites a reply

Reply with ONLY the 4-line message. No labels. No extra text.`;

    default:
      throw new Error(`Unknown channel: "${channel}"`);
  }
}

/**
 * Parses the raw AI text into the structured return value.
 * @param {string} rawText
 * @param {string} channel
 * @returns {{ subject?: string, message: string }}
 */
function parseResponse(rawText, channel) {
  const text = rawText.trim();

  if (channel === 'email') {
    const subjectMatch = text.match(/^SUBJECT:\s*(.+)/im);
    const bodyMatch    = text.match(/^BODY:\s*([\s\S]+)/im);

    const subject = subjectMatch ? subjectMatch[1].trim() : 'Exciting Opportunity for Your Business';
    const message = bodyMatch    ? bodyMatch[1].trim()    : text;

    return { subject, message };
  }

  return { message: text };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a personalised outreach message for the given lead and channel.
 *
 * @param {object} lead     - Lead document (mongoose or plain object).
 * @param {string} channel  - 'sms' | 'email' | 'whatsapp'
 * @returns {Promise<{ subject?: string, message: string }>}
 */
async function generateOutreachMessage(lead, channel) {
  if (!lead) {
    throw new Error('lead is required');
  }

  const normalized = (channel || '').toLowerCase().trim();
  if (!VALID_CHANNELS.includes(normalized)) {
    throw new Error(
      `Invalid channel "${channel}". Must be one of: ${VALID_CHANNELS.join(', ')}`
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = buildPrompt(lead, normalized);

  // SMS replies can be very short; emails need more room.
  const maxTokens = normalized === 'sms' ? 80 : normalized === 'whatsapp' ? 200 : 500;

  const leadLabel = String(lead._id || lead.businessName || 'unknown');

  const rawText = await retry(
    async () => {
      logger.info(
        `[MessageGenerator] Requesting ${normalized} message | lead: ${leadLabel}`
      );

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response &&
        response.content &&
        response.content[0] &&
        response.content[0].text;

      if (!text) {
        throw new Error('Empty response received from Anthropic API');
      }

      return text;
    },
    {
      retries: 3,
      delay: 1000,
      backoff: 2,
      label: `MessageGenerator.generateOutreachMessage(${normalized})`,
    }
  );

  const result = parseResponse(rawText, normalized);

  // Hard-enforce the 160-character SMS cap after generation.
  if (normalized === 'sms' && result.message.length > 160) {
    logger.warn(
      `[MessageGenerator] SMS exceeded 160 chars (${result.message.length}), truncating.`
    );
    result.message = result.message.substring(0, 157) + '...';
  }

  logger.info(
    `[MessageGenerator] ${normalized} message generated successfully | lead: ${leadLabel}`
  );

  return result;
}

module.exports = { generateOutreachMessage };
