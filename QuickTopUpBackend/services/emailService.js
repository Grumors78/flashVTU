const { Resend } = require('resend');

/**
 * Email verification sender, using Resend (https://resend.com).
 *
 * Setup required before this works:
 *   1. RESEND_API_KEY env var — from the Resend dashboard.
 *   2. EMAIL_FROM env var — must be on a domain you've verified in Resend's
 *      dashboard (Domains -> Add Domain -> add the DNS records they give
 *      you). Until a domain is verified, Resend only allows sending to your
 *      own account email, which is fine for initial testing but not for
 *      real users.
 *   3. FRONTEND_URL env var (already in use elsewhere) — used to build the
 *      verification link the user clicks.
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getFrontendBaseUrl() {
  if (!process.env.FRONTEND_URL) return null;
  return process.env.FRONTEND_URL.split(',')[0].trim();
}

/**
 * Sends the "confirm your email" message containing a one-time verification
 * link. Throws if RESEND_API_KEY isn't configured or if Resend reports an
 * error, so callers (the register controller) can decide how to handle a
 * failed send — e.g. still let the account exist but surface a warning.
 */
async function sendVerificationEmail({ to, name, token }) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured on the server');
  }

  const baseUrl = getFrontendBaseUrl();
  if (!baseUrl) {
    throw new Error('FRONTEND_URL is not configured on the server');
  }

  const verifyUrl = `${baseUrl}/verify-email.html?token=${encodeURIComponent(token)}`;
  const fromAddress = process.env.EMAIL_FROM || 'QuickTopUp <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: 'Confirm your QuickTopUp account',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0B0F14;">Hi ${name || 'there'},</h2>
        <p style="color: #344155; font-size: 15px; line-height: 1.5;">
          Thanks for signing up for QuickTopUp. Confirm your email address to activate your wallet and start topping up.
        </p>
        <p style="margin: 28px 0;">
          <a href="${verifyUrl}" style="background: #39FF88; color: #0B0F14; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Confirm my email
          </a>
        </p>
        <p style="color: #5E6E80; font-size: 13px;">
          Or copy this link into your browser:<br/>
          <span style="font-family: monospace;">${verifyUrl}</span>
        </p>
        <p style="color: #5E6E80; font-size: 13px; margin-top: 24px;">
          This link expires in 24 hours. If you didn't create a QuickTopUp account, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || 'Resend reported an error sending the verification email');
  }

  return data;
}

module.exports = { sendVerificationEmail };
