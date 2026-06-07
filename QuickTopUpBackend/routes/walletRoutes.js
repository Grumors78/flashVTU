const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getWallet, fundWallet, purchase } = require('../controllers/walletController');

const router = express.Router();

router.get('/', protect, getWallet);
router.post('/fund', protect, fundWallet);
router.post('/purchase', protect, purchase);

module.exports = router;
