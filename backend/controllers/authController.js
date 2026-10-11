const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  findUserByVerificationToken,
  findUserByResetToken,
} = require('../services/userService');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
} = require('../services/emailService');
const AppError = require('../utils/AppError');

const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || 'http://localhost:5173';
  return url.replace(/\/+$/, '');
};

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

/**
 * POST /api/auth/register
 * Creates a new user account, generates an expiring email verification token,
 * and sends an email verification link.
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password)',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await findUserByEmail(cleanEmail);

    if (existingUser && existingUser.isVerified !== false) {
      throw new AppError('An account with this email already exists', 400);
    }

    // Generate secure 32-byte verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let user;
    if (existingUser && existingUser.isVerified === false) {
      // Re-registration of unverified account: update credentials and refresh token
      await updateUser(existingUser._id, {
        name: name.trim(),
        passwordHash,
        verificationToken: hashedVerificationToken,
        verificationTokenExpire,
      });
      user = { ...existingUser, name: name.trim() };
    } else {
      // Create new user
      user = await createUser({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        isVerified: false,
        verificationToken: hashedVerificationToken,
        verificationTokenExpire,
      });
    }

    // Construct verification link
    const verificationUrl = `${getFrontendUrl()}/verify-email?token=${rawVerificationToken}`;

    // Send verification email
    let emailResult = { success: false };
    try {
      emailResult = await sendVerificationEmail({
        to: cleanEmail,
        name: user.name,
        verificationUrl,
      });
    } catch (emailErr) {
      emailResult = { success: false, error: emailErr.message };
      console.error(`[authController] Failed to send verification email to ${cleanEmail}:`, emailErr.message);
    }

    // Honest reporting based on email status
    if (emailResult.success) {
      return res.status(201).json({
        success: true,
        message: 'Registration successful! A verification email has been sent to your address. Please verify your account before logging in.',
        emailSent: true,
      });
    }

    // If email delivery could not be performed
    if (emailResult.unconfigured) {
      const devMessage = process.env.NODE_ENV !== 'production'
        ? `Account created! Email provider not configured on server. Verification link for local testing: ${verificationUrl}`
        : 'Registration successful! However, email delivery is currently unconfigured on the server. Please contact support.';
      
      return res.status(201).json({
        success: true,
        message: devMessage,
        emailSent: false,
        requiresConfig: true,
      });
    }

    // Email provider configured but failed to deliver - sanitize error to ensure no secret leaks
    const safeError = (emailResult.error || '')
      .replace(/re_[a-zA-Z0-9_]+/gi, '[REDACTED_KEY]')
      .trim();

    const failureReason = safeError ? ` Reason: ${safeError}` : '';

    return res.status(201).json({
      success: true,
      message: `Account created, but we encountered an issue delivering your verification email.${failureReason} Please verify your account or use the resend verification link.`,
      emailSent: false,
      deliveryError: safeError || 'Delivery failed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-email
 * Verifies the user's email address using the expiring token.
 */
const verifyEmail = async (req, res, next) => {
  try {
    const rawToken = req.body?.token || req.query?.token;

    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    const token = rawToken.trim();
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    // Safe diagnostic logging (never prints full raw token, API keys, or passwords)
    console.log(`[authController] verifyEmail request: tokenLength=${token.length}, prefix=${token.substring(0, 4)}...`);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const lookup = await findUserByVerificationToken(hashedToken);

    if (!lookup) {
      console.warn(`[authController] verifyEmail lookup failed: token not found or expired (hash prefix: ${hashedToken.substring(0, 6)}...)`);
      return res.status(400).json({
        success: false,
        message: 'This verification link is invalid or has expired. Please request a new verification link.',
      });
    }

    const { user, isAlreadyVerified } = lookup;

    if (isAlreadyVerified) {
      console.log(`[authController] verifyEmail idempotent: User ${user.email} is already verified.`);
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address has already been successfully verified! You can now log in.',
      });
    }

    // Mark user as verified, clear active token, but retain lastVerifiedToken for idempotency
    await updateUser(user._id, {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpire: null,
      lastVerifiedToken: hashedToken,
      verifiedAt: new Date(),
    });

    console.log(`[authController] User successfully verified: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Your email address has been successfully verified! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-verification
 * Resends a verification email with a fresh expiring token.
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(cleanEmail);

    // If user doesn't exist, return generic response to prevent enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists with this email, a verification link has been sent.',
      });
    }

    // If user is already verified, inform them directly so they are not trapped in a resend loop
    if (user.isVerified === true) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified! You can log in directly.',
      });
    }

    // Generate fresh token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    await updateUser(user._id, {
      verificationToken: hashedVerificationToken,
      verificationTokenExpire,
    });

    const verificationUrl = `${getFrontendUrl()}/verify-email?token=${rawVerificationToken}`;

    let emailResult = { success: false };
    try {
      emailResult = await sendVerificationEmail({
        to: cleanEmail,
        name: user.name,
        verificationUrl,
      });
    } catch (emailErr) {
      console.error(`[authController] Resend verification email failed for ${cleanEmail}:`, emailErr.message);
    }

    if (emailResult.unconfigured && process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: `Email provider not configured. Dev verification link: ${verificationUrl}`,
        emailSent: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an unverified account exists with this email, a verification link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Validates credentials and verifies email confirmation before issuing JWT token.
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(cleanEmail);

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Require email verification - block unverified users while preserving legacy accounts
    if (user.isVerified === false || (!user.isVerified && user.verificationToken)) {
      return res.status(403).json({
        success: false,
        isUnverified: true,
        email: user.email,
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified ?? true,
        token: generateToken(user._id, user.email),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Generates an expiring password reset token and sends a reset email.
 * Never returns the raw reset token in the response JSON.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(cleanEmail);

    const genericSuccessMessage = 'If an account exists with that email address, a password reset link has been sent.';

    // Do not leak whether the user exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericSuccessMessage,
      });
    }

    // Generate random 32-byte reset token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

    await updateUser(user._id, {
      resetPasswordToken: hashedResetToken,
      resetPasswordExpire,
    });

    const resetUrl = `${getFrontendUrl()}/reset-password/${rawResetToken}`;

    let emailResult = { success: false };
    try {
      emailResult = await sendPasswordResetEmail({
        to: cleanEmail,
        name: user.name,
        resetUrl,
      });
    } catch (emailErr) {
      console.error(`[authController] Password reset email failed for ${cleanEmail}:`, emailErr.message);
    }

    if (emailResult.unconfigured && process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: `Email provider not configured on server. Dev reset link: ${resetUrl}`,
        emailSent: false,
      });
    }

    // Never return resetToken in the response body!
    res.status(200).json({
      success: true,
      message: genericSuccessMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Resets the user's password using the token provided in the email link.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both the reset token and your new password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await findUserByResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link. Please request a new password reset.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await updateUser(user._id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpire: null,
      isVerified: true, // Resetting via email proves ownership of email
    });

    console.log(`[authController] Password successfully reset for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user profile.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified ?? true,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
};
