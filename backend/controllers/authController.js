const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, updateUser, findUserByResetToken } = require('../services/userService');
const crypto = require('crypto');

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const AppError = require('../utils/AppError');

/**
 * POST /api/auth/register
 * Validates fields, duplicates, and securely hashes password to store.
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields (name, email, password)' 
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (Never passes plain-text password)
    const createdUser = await createUser({
      name,
      email,
      passwordHash,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        token: generateToken(createdUser._id, createdUser.email),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Validates existence and securely compares hash before issuing JWT token.
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both email and password' 
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id, user.email),
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account exists, a reset link was generated.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await updateUser(user._id, {
      resetPasswordToken,
      resetPasswordExpire
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists, a reset link was generated.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await findUserByResetToken(resetPasswordToken);

    if (!user) {
      throw new AppError('Invalid or expired token', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await updateUser(user._id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpire: null
    });

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
};
