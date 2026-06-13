import { STATUS_COLORS } from './constants';

/**
 * Format a date string or Date object into a human-readable string.
 * @param {string|Date} value
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '—';

  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(date);
}

/**
 * Format a date with time.
 * @param {string|Date} value
 * @returns {string}
 */
export function formatDateTime(value) {
  return formatDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format an Indian phone number.
 * Normalizes +91, 91, or bare 10-digit numbers into +91 XXXXX XXXXX.
 * @param {string|number} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '');

  // Strip leading 91 if 12 digits
  const local = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;

  if (local.length !== 10) return String(phone);

  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/**
 * Format a number with locale-aware thousands separators.
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a value as Indian Rupees.
 * @param {number} value
 * @param {boolean} compact - use 1K, 1L, 1Cr shorthand
 * @returns {string}
 */
export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return '₹0';

  if (compact) {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Truncate a string to a maximum length, appending an ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @param {string} suffix
 * @returns {string}
 */
export function truncate(str, maxLength = 50, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Return Tailwind CSS class strings for a lead status badge.
 * Uses STATUS_COLORS from constants for a single source of truth.
 * @param {string} status
 * @returns {string} Tailwind class string
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}
