const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { walletFundLimiters, vtuPurchaseLimiters } = require('../middleware/purchaseRateLimit');
const {
  getWallet,
  getVirtualAccount,
  initiateFund,
  flutterwaveWebhook,
  verifyFund,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

router.get('/', protect, getWallet);

// Returns (and auto-creates if needed) the user's permanent virtual account.
// Safe to call on every page load — idempotent.
router.get('/virtual-account', protect, getVirtualAccount);

// Email verification enforcement temporarily disabled pending domain setup.
// Re-enable by adding `requireVerified` between `protect` and the rate limiters
// on initiate-fund, verify-fund, and purchase routes.
router.post('/initiate-fund', protect, ...walletFundLimiters, initiateFund);

router.post('/webhook/flutterwave', flutterwaveWebhook);

router.get('/verify-fund/:reference', protect, verifyFund);

router.post('/purchase', protect, ...vtuPurchaseLimiters, purchase);

module.exports = router;
