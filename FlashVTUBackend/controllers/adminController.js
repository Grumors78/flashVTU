const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const Wallet = require('../models/walletModel');
const asyncHandler = require('../middleware/asyncHandler');

const PAGE_SIZE = 50;

const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(PAGE_SIZE, parseInt(req.query.limit) || PAGE_SIZE);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().select('-password').skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(PAGE_SIZE, parseInt(req.query.limit) || PAGE_SIZE);
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(),
  ]);

  res.json({ transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getStats = asyncHandler(async (req, res) => {
  const [userCount, walletCount, transactionCount, totalWalletBalance] = await Promise.all([
    User.countDocuments(),
    Wallet.countDocuments(),
    Transaction.countDocuments(),
    Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
  ]);

  res.json({
    userCount,
    walletCount,
    transactionCount,
    totalWalletBalance: totalWalletBalance[0]?.total || 0,
  });
});

module.exports = { getUsers, getTransactions, getStats };
