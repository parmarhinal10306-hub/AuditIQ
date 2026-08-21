const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applies to all /api/* routes.
 * Limit: 100 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,   // Return RateLimit-* headers per RFC 6585
  legacyHeaders: false,     // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    console.warn(`[rate-limit] General limit hit — IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Strict audit-creation rate limiter
 * Applies ONLY to POST /api/audits.
 * Limit: 10 audit requests per hour per IP.
 */
const auditCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Audit creation limit reached. You can run up to 10 audits per hour. Please try again later.',
  },
  handler: (req, res, next, options) => {
    console.warn(`[rate-limit] Audit creation limit hit — IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

module.exports = { generalLimiter, auditCreationLimiter };
