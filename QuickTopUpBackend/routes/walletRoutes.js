const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getWallet,
  initiateFund,
  paystackWebhook,
  purchase,
} = require('../controllers/walletController');

const router = express.Router();

router.get('/', protect, getWallet);

// Step 1: client calls this to get a payment URL
router.post('/initiate-fund', protect, initiateFund);

// Step 2: payment provider calls this after successful payment
// No `protect` — Paystack calls this server-to-server; verify signature inside the handler
router.post('/webhook/paystack', paystackWebhook);

router.post('/purchase', protect, purchase);

module.exports = router;
