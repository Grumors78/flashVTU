const express = require('express');
const { protect } = require('../middleware/authMiddleware');
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

router.get('/airtime-networks', protect, getAirtimeNetworks);
router.get('/data-networks', protect, getDataNetworks);
router.get('/data-plans', protect, getDataPlans);
router.post('/validate', protect, validateCustomer);
router.post('/airtime', protect, purchaseAirtime);
router.post('/data', protect, purchaseData);
router.post('/cable', protect, purchaseCable);
router.post('/electricity', protect, purchaseElectricity);
router.get('/transaction/:reference', protect, getTransactionStatus);

module.exports = router;
