const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { getUsers, getTransactions, getStats } = require('../controllers/adminController');
const { runReconciliation } = require('../controllers/reconciliationController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.get('/transactions', protect, admin, getTransactions);
router.get('/stats', protect, admin, getStats);

// Manual trigger for the wallet-funding reconciliation safety net —
// admin-only, mirrors what the scheduled job does automatically every
// 10 minutes (see services/reconciliationService.js and the cron setup
// in app.js).
router.post('/reconcile-funding', protect, admin, runReconciliation);

module.exports = router;
