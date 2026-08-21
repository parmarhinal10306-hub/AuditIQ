const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Return validation errors if any, rejecting the request early
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new AppError(errors.array()[0].msg, 400);
    err.name = 'ValidationError';
    err.errors = errors.array().map(e => e.msg);
    return next(err);
  }
  next();
};

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name is too long')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .isLength({ max: 255 }).withMessage('Email is too long')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 1024 }).withMessage('Password must be between 6 and 1024 characters'), // 1024 avoids huge payloads
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 1024 }).withMessage('Password must be valid length'),
  handleValidationErrors
];

const validateAuditCreation = [
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Please provide a valid URL starting with http:// or https://')
    .isLength({ max: 2048 }).withMessage('URL is too long'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateAuditCreation
};
