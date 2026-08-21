const isProd = process.env.NODE_ENV === 'production';

/**
 * Basic logger accommodating dev vs prod differences.
 * Masks deeply sensitive details.
 */
const logger = {
  info: (msg, meta = {}) => {
    if (!isProd) {
      console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] ${msg}`);
  },
  error: (msg, error = null) => {
    const errorBody = error ? (isProd ? error.message : error.stack || error.message) : '';
    // Mask sensitive configs just in case
    const safeBody = errorBody
      .replace(new RegExp(process.env.JWT_SECRET || 'your_secret', 'g'), '***')
      .replace(new RegExp(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', 'g'), '***');
    
    console.error(`[ERROR] ${msg} ${safeBody ? '| ' + safeBody : ''}`);
  }
};

module.exports = logger;
