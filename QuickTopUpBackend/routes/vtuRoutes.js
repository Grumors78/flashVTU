const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { vtuPurchaseLimiters } = require('../middleware/purchaseRateLimit');
const {
  getAirtimeNetworks,
  getDataNetworks,
  getDataPlans,
  validateCustomer,
  purchaseAirtime,
  purchaseData,
  purchaseCable,
  purchaseElectricity,
  getTransactionStatus,
} = require('../controllers/vtuController');

const router = express.Router();

// Read-only / no-cost lookups — not rate limited beyond normal auth.
router.get('/airtime-networks', protect, getAirtimeNetworks);
router.get('/data-networks', protect, getDataNetworks);
router.get('/data-plans', protect, getDataPlans);
router.post('/validate', protect, validateCustomer);
router.get('/transaction/:reference', protect, getTransactionStatus);

// Purchase endpoints — each one calls PeyFlex and can result in an
// irreversible debit on success. Rate limited per-user AND per-IP
// (10/min each) so a single trip of either limiter blocks the request.
// `protect` MUST run before these limiters since they key off req.user._id.
router.post('/airtime', protect, ...vtuPurchaseLimiters, purchaseAirtime);
router.post('/data', protect, ...vtuPurchaseLimiters, purchaseData);
router.post('/cable', protect, ...vtuPurchaseLimiters, purchaseCable);
router.post('/electricity', protect, ...vtuPurchaseLimiters, purchaseElectricity);

module.exports = router;
