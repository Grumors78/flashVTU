const express = require('express');
const { protect, requireVerified } = require('../middleware/authMiddleware');
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

// Read-only lookups — browsing networks/plans doesn't move money, so these
// stay available even to unverified accounts (lets them see what's on offer
// before going through verification).
router.get('/airtime-networks', protect, getAirtimeNetworks);
router.get('/data-networks', protect, getDataNetworks);
router.get('/data-plans', protect, getDataPlans);
router.post('/validate', protect, validateCustomer);
router.get('/transaction/:reference', protect, getTransactionStatus);

// Purchase endpoints — protect -> requireVerified -> rate limit -> handler.
router.post('/airtime', protect, requireVerified, ...vtuPurchaseLimiters, purchaseAirtime);
router.post('/data', protect, requireVerified, ...vtuPurchaseLimiters, purchaseData);
router.post('/cable', protect, requireVerified, ...vtuPurchaseLimiters, purchaseCable);
router.post('/electricity', protect, requireVerified, ...vtuPurchaseLimiters, purchaseElectricity);

module.exports = router;
