const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const generateReference = require('../utils/generateReference');

const getWallet = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found' });
  }
  res.json(wallet);
};

const fundWallet = async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'A positive amount is required' });
  }

  let wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
    wallet = await Wallet.create({ user: req.user._id });
  }

  const reference = generateReference();
  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'wallet_fund',
    amount,
    status: 'success',
    reference,
    provider: 'Paystack',
    details: 'Wallet funding placeholder',
    metadata: { source: 'wallet_fund' },
  });

  await wallet.credit(amount);
  res.status(200).json({
    message: 'Wallet funded successfully',
    balance: wallet.balance,
    transaction,
  });
};

const purchase = async (req, res) => {
  const { amount, serviceCode, target } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'A positive transaction amount is required' });
  }

  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ message: 'Insufficient wallet balance' });
  }

  const reference = generateReference();
  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'purchase',
    amount,
    status: 'success',
    reference,
    provider: 'VTU',
    details: `Purchase created for service ${serviceCode || 'unknown'}`,
    metadata: { target: target || null, serviceCode: serviceCode || null },
  });

  await wallet.debit(amount);
  res.json({
    message: 'Purchase completed successfully',
    balance: wallet.balance,
    transaction,
  });
};

module.exports = {
  getWallet,
  fundWallet,
  purchase,
};
