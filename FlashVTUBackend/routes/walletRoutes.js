const express = require('express');
const { protect, requireVerified } = require('../middleware/authMiddleware');
const { walletFundLimiters, vtuPurchaseLimiters } = require('../middleware/purchaseRateLimit');
const {
  getWallet,
  initiateFund,
  flutterwaveWebhook,
  verifyFund,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

// Wallet balance readable even when unverified
router.get('/', protect, getWallet);

// Money-moving routes: protect -> requireVerified -> rate limit -> handler
router.post('/initiate-fund', protect, requireVerified, ...walletFundLimiters, initiateFund);

// Flutterwave webhook — no protect, no requireVerified.
// Flutterwave is the caller; verif-hash header verification happens inside the handler.
// Raw body not needed here since Flutterwave uses a simple string hash, not HMAC.
router.post('/webhook/flutterwave', flutterwaveWebhook);

// Fallback: frontend calls this when user returns from Flutterwave checkout.
// Accepts optional ?transaction_id= query param for Flutterwave's numeric ID.
router.get('/verify-fund/:reference', protect, requireVerified, verifyFund);

router.post('/purchase', protect, requireVerified, ...vtuPurchaseLimiters, purchase);

module.exports = router;
