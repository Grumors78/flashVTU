const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const generateReference = require('../utils/generateReference');
const vtuProvider = require('../services/vtuProvider');

const getDataPlans = async (req, res) => {
  const { network } = req.query;
  if (!network) {
    return res.status(400).json({ message: 'Network is required to fetch data plans' });
  }

  const plans = await vtuProvider.getDataPlans(network);
  res.json({ network, plans });
};

const validateCustomer = async (req, res) => {
  const payload = req.body;
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ message: 'Validation payload is required' });
  }

  const result = await vtuProvider.validateCustomer(payload);
  res.json(result);
};

const purchaseAirtime = async (req, res) => {
  const { network, phone, amount } = req.body;
  if (!network || !phone || !amount) {
    return res.status(400).json({ message: 'Network, phone, and amount are required for airtime purchase' });
  }

  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ message: 'Insufficient wallet balance' });
  }

  const reference = generateReference();
  const providerResponse = await vtuProvider.purchaseAirtime({ network, phone, amount, reference });
  const status = providerResponse.status === 'success' || providerResponse.success ? 'success' : 'pending';

  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'purchase',
    amount,
    status,
    reference,
    provider: 'VTU',
    details: providerResponse.message || `Airtime purchase for ${phone}`,
    metadata: { service: 'airtime', network, phone, providerResponse },
  });

  if (status === 'success') {
    await wallet.debit(amount);
  }

  res.status(200).json({
    message: 'Airtime purchase request processed',
    balance: wallet.balance,
    transaction,
    providerResponse,
  });
};

const purchaseData = async (req, res) => {
  const { network, phone, bundleCode, amount } = req.body;
  if (!network || !phone || !bundleCode || !amount) {
    return res.status(400).json({ message: 'Network, phone, bundleCode, and amount are required for data purchase' });
  }

  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ message: 'Insufficient wallet balance' });
  }

  const reference = generateReference();
  const providerResponse = await vtuProvider.purchaseData({ network, phone, bundleCode, amount, reference });
  const status = providerResponse.status === 'success' || providerResponse.success ? 'success' : 'pending';

  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'purchase',
    amount,
    status,
    reference,
    provider: 'VTU',
    details: providerResponse.message || `Data bundle purchase for ${phone}`,
    metadata: { service: 'data', network, phone, bundleCode, providerResponse },
  });

  if (status === 'success') {
    await wallet.debit(amount);
  }

  res.status(200).json({
    message: 'Data purchase request processed',
    balance: wallet.balance,
    transaction,
    providerResponse,
  });
};

const purchaseCable = async (req, res) => {
  const { service, smartcardNumber, packageCode, amount } = req.body;
  if (!service || !smartcardNumber || !packageCode || !amount) {
    return res.status(400).json({ message: 'Service, smartcardNumber, packageCode, and amount are required for cable purchase' });
  }

  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ message: 'Insufficient wallet balance' });
  }

  const reference = generateReference();
  const providerResponse = await vtuProvider.purchaseCable({ service, smartcardNumber, packageCode, amount, reference });
  const status = providerResponse.status === 'success' || providerResponse.success ? 'success' : 'pending';

  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'purchase',
    amount,
    status,
    reference,
    provider: 'VTU',
    details: providerResponse.message || `Cable purchase for ${service}`,
    metadata: { service: 'cable', providerService: service, smartcardNumber, packageCode, providerResponse },
  });

  if (status === 'success') {
    await wallet.debit(amount);
  }

  res.status(200).json({
    message: 'Cable purchase request processed',
    balance: wallet.balance,
    transaction,
    providerResponse,
  });
};

const purchaseElectricity = async (req, res) => {
  const { distributor, meterNumber, meterType, amount } = req.body;
  if (!distributor || !meterNumber || !amount) {
    return res.status(400).json({ message: 'Distributor, meterNumber, and amount are required for electricity purchase' });
  }

  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ message: 'Insufficient wallet balance' });
  }

  const reference = generateReference();
  const providerResponse = await vtuProvider.purchaseElectricity({ distributor, meterNumber, meterType, amount, reference });
  const status = providerResponse.status === 'success' || providerResponse.success ? 'success' : 'pending';

  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'purchase',
    amount,
    status,
    reference,
    provider: 'VTU',
    details: providerResponse.message || `Electricity purchase for meter ${meterNumber}`,
    metadata: { service: 'electricity', distributor, meterNumber, meterType, providerResponse },
  });

  if (status === 'success') {
    await wallet.debit(amount);
  }

  res.status(200).json({
    message: 'Electricity purchase request processed',
    balance: wallet.balance,
    transaction,
    providerResponse,
  });
};

const getTransactionStatus = async (req, res) => {
  const { reference } = req.params;
  if (!reference) {
    return res.status(400).json({ message: 'Reference is required' });
  }

  const status = await vtuProvider.getTransactionStatus(reference);
  res.json(status);
};

module.exports = {
  getDataPlans,
  validateCustomer,
  purchaseAirtime,
  purchaseData,
  purchaseCable,
  purchaseElectricity,
  getTransactionStatus,
};
