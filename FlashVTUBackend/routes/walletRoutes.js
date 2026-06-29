const express = require('express');
const { protect, requireVerified } = require('../middleware/authMiddleware');
const { walletFundLimiters, vtuPurchaseLimiters } = require('../middleware/purchaseRateLimit');
const {
  getWallet,
  initiateFund,
  paystackWebhook,
  verifyFund,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

// Wallet balance is readable even when unverified, so a user can see their
// own state (and the "please verify" prompts elsewhere can reference it).
router.get('/', protect, getWallet);

// Money-moving routes: protect -> requireVerified -> rate limit -> handler.
// Order matters — we need to know who the user is (protect) before we can
// check whether they're verified, and there's no point spending a rate-limit
// slot on a request we're about to reject anyway for being unverified.
router.post('/initiate-fund', protect, requireVerified, ...walletFundLimiters, initiateFund);

// Paystack webhook — no `protect`, no `requireVerified`. Paystack is the
// caller here, not an end user; the HMAC signature check inside the handler
// is the real gate. The transaction this resolves was already created by an
// already-verified user back when they called initiate-fund.
router.post('/webhook/paystack', paystackWebhook);

router.get('/verify-fund/:reference', protect, requireVerified, verifyFund);

router.post('/purchase', protect, requireVerified, ...vtuPurchaseLimiters, purchase);

module.exports = router;
