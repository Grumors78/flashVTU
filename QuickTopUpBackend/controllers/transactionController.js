const Transaction = require('../models/transactionModel');
const asyncHandler = require('../middleware/asyncHandler');

const PAGE_SIZE = 20;

const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(PAGE_SIZE, parseInt(req.query.limit) || PAGE_SIZE);
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ user: req.user._id }),
  ]);

  res.json({
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  res.json(transaction);
});

module.exports = { getTransactions, getTransaction };
