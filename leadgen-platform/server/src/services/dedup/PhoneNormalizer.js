'use strict';

/**
 * PhoneNormalizer
 *
 * Normalizes raw Indian phone numbers to the canonical E.164 format: +91XXXXXXXXXX
 *
 * Strips common separators, removes country-code prefixes (+91, 0091, 91, leading 0),
 * then validates that the resulting 10-digit string starts with 6-9 (valid Indian
 * mobile prefix). Returns null for anything that cannot be normalized.
 */

/**
 * @param {*} raw - Raw phone value (string, number, etc.)
 * @returns {string|null} Normalized phone in +91XXXXXXXXXX format, or null if invalid.
 */
function normalize(raw) {
  if (!raw) return null;

  let phone = String(raw).replace(/[\s\-\(\)\.]/g, '');

  if (phone.startsWith('+91')) phone = phone.slice(3);
  else if (phone.startsWith('0091')) phone = phone.slice(4);
  else if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);
  else if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);

  if (!/^[6-9]\d{9}$/.test(phone)) return null;

  return '+91' + phone;
}

module.exports = { normalize };
