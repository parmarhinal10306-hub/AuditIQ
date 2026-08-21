const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Capture basic error information
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  // 1. Identify Database Errors (e.g., MongoDB driver errors)
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    statusCode = 500;
    message = 'Something went wrong'; // Mask database error details
    logger.error('Database connection / query error:', err);
  }
  // 2. Identification of Authentication/Authorization errors is usually JWT errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication failed';
    logger.error('Authentication error:', err);
  }
  // 3. Website fetch errors usually have a specific status code set in our controllers, but let's handle globally
  else if (err.isFetchError) {
    statusCode = 422;
    // message is passed from fetchError
    logger.warn('Website fetch failure:', err);
  }
  // 4. Validation errors from express-validator (Wait, I handle this inside the router currently. But if any bubble up...)
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    logger.warn('Validation error handled');
  }
  // 5. Unexpected server errors
  else if (statusCode === 500) {
    message = 'Something went wrong';
    logger.error('Unexpected server error:', err);
  } else {
    // Other operational errors (e.g. 404, 403, etc)
    logger.warn(`API Error ${statusCode}:`, err);
  }

  // Ensure message defaults gracefully if omitted
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong';
  }

  // Standard JSON response
  const responseData = {
    success: false,
    message
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    responseData.stack = err.stack;
  }

  res.status(statusCode).json(responseData);
};

module.exports = { errorHandler };
