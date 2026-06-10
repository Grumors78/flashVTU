const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const generateReference = require('../utils/generateReference');
const vtuProvider = require('../services/vtuProvider');
const asyncHandler = require('../middleware/asyncHandler');

const getDataPlans = asyncHandler(async (req, res) => {
  const { network } = req.query;
  if (!network) {
    res.status(400);
    throw new Error('Network is required to fetch data plans');
  }
  const plans = await vtuProvider.getDataPlans(network);
  res.json({ network, plans });
});

const validateCustomer = asyncHandler(async (req, res) => {
  const payload = req.body;
  if (!payload || Object.keys(payload).length === 0) {
    res.status(400);
    throw new Error('Validation payload is required');
  }
  const result = await vtuProvider.validateCustomer(payload);
  res.json(result);
});

/**
 * Shared purchase helper used by all VTU purchase endpoints.
 *
 * Key fixes vs the original:
 *  1. asyncHandler — all DB/provider errors are forwarded to errorHandler.
 *  2. Atomic debit via wallet.debit() (findOneAndUpdate with balance >= amount)
 *     prevents concurrent requests from both passing the balance check.
 *  3. Balance in the response is read AFTER the debit so the value is accurate.
 *  4. Transaction is created with status 'pending' first, then updated to
 *     'success'/'failed' based on the provider response — prevents phantom
 *     success records if the provider call throws.
 */
async function handlePurchase({ res, userId, amount, metadata, providerCall, details }) {
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  if (wallet.balance < amount) {
    res.status(400);
    throw new Error('Insufficient wallet balance');
  }

  const reference = generateReference();

  // Create a pending transaction before calling the provider
  const transaction = await Transaction.create({
    user: userId,
    type: 'purchase',
    amount,
    status: 'pending',
    reference,
    provider: 'VTU',
    details,
    metadata,
  });

  let providerResponse;
  let status = 'failed';

  try {
    providerResponse = await providerCall(reference);
    status =
      providerResponse.status === 'success' || providerResponse.success
        ? 'success'
        : 'pending';
  } catch (err) {
    // Provider call failed — mark transaction failed, do NOT debit
    transaction.status = 'failed';
    transaction.details = err.message || 'Provider call failed';
    await transaction.save();
    throw err;
  }

  // Atomic debit — only runs when provider succeeded
  if (status === 'success') {
    await wallet.debit(amount); // throws if balance insufficient (race safety)
  }

  transaction.status = status;
  transaction.metadata = { ...transaction.metadata, providerResponse };
  await transaction.save();

  return res.status(200).json({
    message: 'Purchase request processed',
    balance: wallet.balance, // post-debit value from the atomic update
    transaction,
    providerResponse,
  });
}

const purchaseAirtime = asyncHandler(async (req, res) => {
  const { network, phone, amount } = req.body;
  if (!network || !phone || !amount) {
    res.status(400);
    throw new Error('Network, phone, and amount are required for airtime purchase');
  }
  await handlePurchase({
    res,
    userId: req.user._id,
    amount,
    details: `Airtime purchase for ${phone}`,
    metadata: { service: 'airtime', network, phone },
    providerCall: (reference) =>
      vtuProvider.purchaseAirtime({ network, phone, amount, reference }),
  });
});

const purchaseData = asyncHandler(async (req, res) => {
  const { network, phone, bundleCode, amount } = req.body;
  if (!network || !phone || !bundleCode || !amount) {
    res.status(400);
    throw new Error('Network, phone, bundleCode, and amount are required for data purchase');
  }
  await handlePurchase({
    res,
    userId: req.user._id,
    amount,
    details: `Data bundle purchase for ${phone}`,
    metadata: { service: 'data', network, phone, bundleCode },
    providerCall: (reference) =>
      vtuProvider.purchaseData({ network, phone, bundleCode, amount, reference }),
  });
});

const purchaseCable = asyncHandler(async (req, res) => {
  const { service, smartcardNumber, packageCode, amount } = req.body;
  if (!service || !smartcardNumber || !packageCode || !amount) {
    res.status(400);
    throw new Error(
      'Service, smartcardNumber, packageCode, and amount are required for cable purchase'
    );
  }
  await handlePurchase({
    res,
    userId: req.user._id,
    amount,
    details: `Cable purchase for ${service}`,
    metadata: { service: 'cable', providerService: service, smartcardNumber, packageCode },
    providerCall: (reference) =>
      vtuProvider.purchaseCable({ service, smartcardNumber, packageCode, amount, reference }),
  });
});

const purchaseElectricity = asyncHandler(async (req, res) => {
  const { distributor, meterNumber, meterType, amount } = req.body;
  if (!distributor || !meterNumber || !amount) {
    res.status(400);
    throw new Error(
      'Distributor, meterNumber, and amount are required for electricity purchase'
    );
  }
  await handlePurchase({
    res,
    userId: req.user._id,
    amount,
    details: `Electricity purchase for meter ${meterNumber}`,
    metadata: { service: 'electricity', distributor, meterNumber, meterType },
    providerCall: (reference) =>
      vtuProvider.purchaseElectricity({ distributor, meterNumber, meterType, amount, reference }),
  });
});

const getTransactionStatus = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  if (!reference) {
    res.status(400);
    throw new Error('Reference is required');
  }
  const status = await vtuProvider.getTransactionStatus(reference);
  res.json(status);
});

module.exports = {
  getDataPlans,
  validateCustomer,
  purchaseAirtime,
  purchaseData,
  purchaseCable,
  purchaseElectricity,
  getTransactionStatus,
};
