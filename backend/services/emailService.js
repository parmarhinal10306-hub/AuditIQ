const nodemailer = require('nodemailer');

/**
 * AuditIQ Email Service
 * Supports:
 * 1. Resend API (via RESEND_API_KEY using native fetch)
 * 2. Standard SMTP via Nodemailer (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE)
 *
 * If no provider is configured, it fails gracefully and reports honest error details.
 */

const getEmailFrom = () => {
  return process.env.EMAIL_FROM || 'AuditIQ <onboarding@resend.dev>';
};

/**
 * Checks whether an email provider is configured in environment variables.
 */
const isEmailConfigured = () => {
  if (process.env.RESEND_API_KEY) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return false;
};

/**
 * Sends an email using Resend API.
 */
const sendViaResend = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getEmailFrom();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Resend API returned status ${response.status}`;
    console.error(`[emailService] Resend send error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`[emailService] Email sent via Resend to ${to} (ID: ${data.id})`);
  return { success: true, id: data.id, provider: 'resend' };
};

/**
 * Sends an email using Nodemailer / SMTP.
 */
const sendViaSmtp = async ({ to, subject, html, text }) => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = getEmailFrom();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });

  console.log(`[emailService] Email sent via SMTP to ${to} (MessageID: ${info.messageId})`);
  return { success: true, id: info.messageId, provider: 'smtp' };
};

/**
 * Core dispatch function.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to || !subject) {
    throw new Error('Missing required email fields (to, subject)');
  }

  if (process.env.RESEND_API_KEY) {
    return await sendViaResend({ to, subject, html, text });
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return await sendViaSmtp({ to, subject, html, text });
  }

  // No provider configured
  const warningMsg = 'No email provider configured. Please set RESEND_API_KEY or (SMTP_HOST, SMTP_USER, SMTP_PASS).';
  console.warn(`[emailService] ${warningMsg}`);
  
  // Output link for local debugging / development only
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[emailService] [DEV LOG] To: ${to} | Subject: ${subject}`);
  }

  return {
    success: false,
    unconfigured: true,
    message: warningMsg,
  };
};

/**
 * Send Email Verification Link
 */
const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const subject = 'Verify your email address - AuditIQ';
  const displayName = name ? name.split(' ')[0] : 'there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; }
        .logo { font-size: 20px; font-weight: 800; color: #1d4ed8; text-decoration: none; margin-bottom: 24px; display: inline-block; }
        h1 { font-size: 22px; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
        p { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .button-wrap { margin: 28px 0; }
        .btn { display: inline-block; background-color: #1d4ed8; color: #ffffff !important; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 6px; }
        .link-alt { font-size: 13px; color: #94a3b8; word-break: break-all; margin-top: 24px; }
        .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="#" class="logo">AuditIQ</a>
        <h1>Verify your email address</h1>
        <p>Hi ${displayName},</p>
        <p>Thanks for creating an account with AuditIQ. Please verify your email address to activate your account and start auditing your websites.</p>
        <div class="button-wrap">
          <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
        </div>
        <p>This verification link will expire in 24 hours.</p>
        <div class="link-alt">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </div>
        <div class="footer">
          If you didn't create an AuditIQ account, you can safely ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${displayName},\n\nThanks for signing up for AuditIQ. Please verify your email by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not sign up, please ignore this email.`;

  return await sendEmail({ to, subject, html, text });
};

/**
 * Send Password Reset Link
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = 'Reset your password - AuditIQ';
  const displayName = name ? name.split(' ')[0] : 'there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; }
        .logo { font-size: 20px; font-weight: 800; color: #1d4ed8; text-decoration: none; margin-bottom: 24px; display: inline-block; }
        h1 { font-size: 22px; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
        p { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .button-wrap { margin: 28px 0; }
        .btn { display: inline-block; background-color: #1d4ed8; color: #ffffff !important; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 6px; }
        .link-alt { font-size: 13px; color: #94a3b8; word-break: break-all; margin-top: 24px; }
        .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="#" class="logo">AuditIQ</a>
        <h1>Reset your password</h1>
        <p>Hi ${displayName},</p>
        <p>We received a request to reset the password for your AuditIQ account. Click the button below to choose a new password:</p>
        <div class="button-wrap">
          <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
        </div>
        <p>This password reset link will expire in 1 hour.</p>
        <div class="link-alt">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
        <div class="footer">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${displayName},\n\nWe received a request to reset your password. Use the link below to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`;

  return await sendEmail({ to, subject, html, text });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
};
