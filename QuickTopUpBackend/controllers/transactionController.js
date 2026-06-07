const Transaction = require('../models/transactionModel');

const getTransactions = async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(transactions);
};

const getTransaction = async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  res.json(transaction);
};

module.exports = {
  getTransactions,
  getTransaction,
};
