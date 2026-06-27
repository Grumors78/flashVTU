const rateLimit = require('express-rate-limit');

/**
 * Rate limiting for money-moving endpoints, layered two ways:
 *
 *   1. Per-user — keyed on req.user._id (requires `protect` to have already
 *      run, so this MUST be mounted after `protect` in the route chain).
 *      Stops one compromised/malicious account from hammering the API
 *      regardless of how many IPs it's coming from.
 *
 *   2. Per-IP — keyed on the request's IP (the express-rate-limit default).
 *      Stops one IP from hammering the API across multiple accounts
 *      (e.g. a script creating/cycling through several test accounts).
 *
 * Both limiters are mounted on the same route; a request is blocked if it
 * trips EITHER one. This is intentionally separate from the IP-only limiter
 * already on /auth/login and /auth/register — those guard against
 * credential-stuffing noise, this guards against actual money movement.
 */

function buildLimiterPair({ windowMs, max, message }) {
  const perUser = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    // Falls back to IP if somehow called before `protect` populates req.user
    // (shouldn't happen given route order, but avoids a hard crash if it does).
    keyGenerator: (req) => (req.user ? `user:${req.user._id}` : `ip:${req.ip}`),
  });

  const perIp = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    // Default keyGenerator (IP-based) — explicit here for clarity.
    keyGenerator: (req) => `ip:${req.ip}`,
  });

  return [perUser, perIp];
}

/**
 * VTU purchases (airtime, data, cable, electricity) — 10 requests/minute,
 * per user AND per IP. Tight because each request triggers a real PeyFlex
 * API call and, on success, an irreversible debit.
 */
const vtuPurchaseLimiters = buildLimiterPair({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many purchase requests. Please wait a moment and try again.',
});

/**
 * Wallet funding initiation — 10 requests/minute, per user AND per IP.
 * Slightly more headroom conceptually since this only creates a pending
 * transaction and a Paystack checkout link (no debit happens here), but
 * kept at the same number for now per your call — easy to loosen later by
 * changing one number if real usage shows it's too tight.
 */
const walletFundLimiters = buildLimiterPair({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many funding requests. Please wait a moment and try again.',
});

module.exports = { vtuPurchaseLimiters, walletFundLimiters };
