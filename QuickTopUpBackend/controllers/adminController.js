const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const Wallet = require('../models/walletModel');

const getUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

const getTransactions = async (req, res) => {
  const transactions = await Transaction.find().sort({ createdAt: -1 });
  res.json(transactions);
};

const getStats = async (req, res) => {
  const userCount = await User.countDocuments();
  const walletCount = await Wallet.countDocuments();
  const transactionCount = await Transaction.countDocuments();
  const totalWalletBalance = await Wallet.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$balance' },
      },
    },
  ]);

  res.json({
    userCount,
    walletCount,
    transactionCount,
    totalWalletBalance: totalWalletBalance[0]?.total || 0,
  });
};

module.exports = {
  getUsers,
  getTransactions,
  getStats,
};
