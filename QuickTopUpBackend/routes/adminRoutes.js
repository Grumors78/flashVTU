const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { getUsers, getTransactions, getStats } = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.get('/transactions', protect, admin, getTransactions);
router.get('/stats', protect, admin, getStats);

module.exports = router;
