const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { walletFundLimiters, vtuPurchaseLimiters } = require('../middleware/purchaseRateLimit');
const {
  getWallet,
  createFundingAccount,
  initiateFund,
  flutterwaveWebhook,
  verifyFund,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

router.get('/', protect, getWallet);

// Generates a temporary virtual account for a specific funding amount.
// POST because it creates a new pending transaction and calls Flutterwave.
router.post('/create-funding-account', protect, ...walletFundLimiters, createFundingAccount);

// Email verification enforcement temporarily disabled pending domain setup.
// Re-enable by adding `requireVerified` between `protect` and the rate limiters
// on initiate-fund, verify-fund, and purchase routes.
router.post('/initiate-fund', protect, ...walletFundLimiters, initiateFund);

router.post('/webhook/flutterwave', flutterwaveWebhook);

router.get('/verify-fund/:reference', protect, verifyFund);

router.post('/purchase', protect, ...vtuPurchaseLimiters, purchase);

module.exports = router;
