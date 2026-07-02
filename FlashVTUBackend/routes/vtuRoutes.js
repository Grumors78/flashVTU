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

// Read-only lookups
router.get('/airtime-networks', protect, getAirtimeNetworks);
router.get('/data-networks', protect, getDataNetworks);
router.get('/data-plans', protect, getDataPlans);
router.post('/validate', protect, validateCustomer);
router.get('/transaction/:reference', protect, getTransactionStatus);

// Purchase endpoints — email verification temporarily disabled pending domain setup.
// Re-enable by adding `requireVerified` between `protect` and the rate limiters.
router.post('/airtime', protect, ...vtuPurchaseLimiters, purchaseAirtime);
router.post('/data', protect, ...vtuPurchaseLimiters, purchaseData);
router.post('/cable', protect, ...vtuPurchaseLimiters, purchaseCable);
router.post('/electricity', protect, ...vtuPurchaseLimiters, purchaseElectricity);

module.exports = router;
