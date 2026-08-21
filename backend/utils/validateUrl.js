/**
 * utils/validateUrl.js
 *
 * Utility to validate that a submitted URL is a properly formatted
 * http:// or https:// address. Will be used by audit routes.
 */
const validateUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return false;
  try {
    const parsed = new URL(raw.trim());
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

module.exports = { validateUrl };
