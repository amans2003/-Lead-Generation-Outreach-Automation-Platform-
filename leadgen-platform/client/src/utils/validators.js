/**
 * Validate an email address.
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required.' };
  }

  const trimmed = email.trim();
  // RFC 5322 simplified pattern
  const pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  if (!pattern.test(trimmed)) {
    return { valid: false, message: 'Enter a valid email address.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validate an Indian phone number.
 * Accepts:
 *  - 10-digit numbers starting with 6–9
 *  - Numbers with +91 or 91 prefix
 *  - Spaces or dashes as separators
 * @param {string|number} phone
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: false, message: 'Phone number is required.' };
  }

  const digits = String(phone).replace(/[\s\-().+]/g, '');

  // Strip country code
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 13 && digits.startsWith('091')
      ? digits.slice(3)
      : digits;

  if (local.length !== 10) {
    return { valid: false, message: 'Phone number must be 10 digits.' };
  }

  if (!/^[6-9]/.test(local)) {
    return { valid: false, message: 'Enter a valid Indian mobile number.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validate that a value is present (non-empty string, non-null, non-undefined).
 * @param {*} value
 * @param {string} fieldName
 * @returns {{ valid: boolean, message: string }}
 */
export function validateRequired(value, fieldName = 'This field') {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty) {
    return { valid: false, message: `${fieldName} is required.` };
  }

  return { valid: true, message: '' };
}

/**
 * Validate minimum string length.
 * @param {string} value
 * @param {number} min
 * @param {string} fieldName
 * @returns {{ valid: boolean, message: string }}
 */
export function validateMinLength(value, min = 3, fieldName = 'This field') {
  if (!value || value.trim().length < min) {
    return { valid: false, message: `${fieldName} must be at least ${min} characters.` };
  }
  return { valid: true, message: '' };
}

/**
 * Validate password strength.
 * Min 8 chars, at least one uppercase, one lowercase, one digit.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password) return { valid: false, message: 'Password is required.' };
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one digit.' };
  return { valid: true, message: '' };
}
