const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTransactions, getTransaction } = require('../controllers/transactionController');

const router = express.Router();

router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransaction);

module.exports = router;
