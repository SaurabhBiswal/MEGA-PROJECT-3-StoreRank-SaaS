const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Creates a reusable Nodemailer transporter using environment variables.
 *
 * Required env:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 * - EMAIL_FROM (optional, falls back to SMTP_USER)
 */
const createTransporter = () => {
  if (!process.env.SMTP_HOST) {
    console.warn('📭 SMTP_HOST not configured, email notifications are disabled.');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const transporter = createTransporter();

/**
 * Sends an email about a new rating to the store owner (or store email).
 */
async function sendNewRatingEmail({ to, storeName, rating, comment, userName }) {
  if (!transporter || !to) return;

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const subject = `New rating received for ${storeName}`;
  const text = [
    `Your store "${storeName}" just received a new rating.`,
    ``,
    `Rating: ${rating} / 5`,
    userName ? `From: ${userName}` : '',
    comment ? `Comment: ${comment}` : 'No written comment provided.',
    ``,
    `This is an automated notification from the Store Rating Platform.`,
  ].filter(Boolean).join('\n');

  const html = `
    <h2>New rating received for <strong>${storeName}</strong></h2>
    <p><strong>Rating:</strong> ${rating} / 5</p>
    ${userName ? `<p><strong>From:</strong> ${userName}</p>` : ''}
    <p><strong>Comment:</strong> ${comment || 'No written comment provided.'}</p>
    <hr/>
    <p style="font-size:12px;color:#64748b;">Automated notification from Store Rating Platform.</p>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`📧 Email notification sent to ${to} for store "${storeName}"`);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

module.exports = {
  sendNewRatingEmail,
};

