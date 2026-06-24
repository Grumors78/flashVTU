const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getWallet,
  initiateFund,
  paystackWebhook,
  verifyFund,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

router.get('/', protect, getWallet);

// Step 1: client calls this to get a Paystack payment URL
router.post('/initiate-fund', protect, initiateFund);

// Step 2 (primary): Paystack calls this server-to-server after payment.
// No `protect` — Paystack is the caller; signature verification happens inside.
router.post('/webhook/paystack', paystackWebhook);

// Step 2 (fallback): frontend calls this when the user is redirected back
// via callback_url, so funding can complete even if the webhook is delayed.
router.get('/verify-fund/:reference', protect, verifyFund);

router.post('/purchase', protect, purchase);

module.exports = router;
