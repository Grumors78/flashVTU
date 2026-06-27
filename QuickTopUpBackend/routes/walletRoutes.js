const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { walletFundLimiters, vtuPurchaseLimiters } = require('../middleware/purchaseRateLimit');
const {
  getWallet,
  initiateFund,
  paystackWebhook,
  verifyFund,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

router.get('/', protect, getWallet);

// Step 1: client calls this to get a Paystack payment URL.
// Rate limited per-user AND per-IP (10/min each) — creates a pending
// transaction and hits Paystack's API on every call.
router.post('/initiate-fund', protect, ...walletFundLimiters, initiateFund);

// Step 2 (primary): Paystack calls this server-to-server after payment.
// No `protect`, no rate limit — Paystack is the caller, not an end user;
// signature verification inside the handler is the real gate here.
router.post('/webhook/paystack', paystackWebhook);

// Step 2 (fallback): frontend calls this when the user is redirected back
// via callback_url, so funding can complete even if the webhook is delayed.
router.get('/verify-fund/:reference', protect, verifyFund);

// Generic wallet purchase/debit — same limiter tier as VTU purchases since
// it directly debits the wallet on success.
router.post('/purchase', protect, ...vtuPurchaseLimiters, purchase);

module.exports = router;
