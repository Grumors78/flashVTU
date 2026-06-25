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
 * Shared purchase helper for all VTU services.
 *
 * PeyFlex's API resolves (success) or throws (failure) synchronously — no
 * documented "pending" state. So the outcome is known immediately:
 *   - provider call resolves -> mark transaction 'success', debit wallet
 *   - provider call throws   -> mark transaction 'failed', do NOT debit
 *
 * The transaction is created as 'pending' first so a crash between the
 * provider call and the status update still leaves an auditable record.
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

  const transaction = await Transaction.create({
    user: userId,
    type: 'purchase',
    amount,
    status: 'pending',
    reference,
    provider: 'PeyFlex',
    details,
    metadata,
  });

  let providerResponse;
  try {
    providerResponse = await providerCall();
  } catch (err) {
    transaction.status = 'failed';
    transaction.details = err.message || 'Provider call failed';
    transaction.metadata = { ...transaction.metadata, providerError: err.peyflexResponse || err.message };
    await transaction.save();
    throw err;
  }

  const updatedWallet = await wallet.debit(amount);

  transaction.status = 'success';
  transaction.metadata = { ...transaction.metadata, providerResponse };
  await transaction.save();

  return res.status(200).json({
    message: 'Purchase completed successfully',
    balance: updatedWallet.balance,
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
    providerCall: () => vtuProvider.purchaseAirtime({ network, phone, amount }),
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
    providerCall: () => vtuProvider.purchaseData({ network, phone, bundleCode }),
  });
});

const purchaseCable = asyncHandler(async (req, res) => {
  const { service, smartcardNumber, packageCode, amount, phone } = req.body;
  if (!service || !smartcardNumber || !packageCode || !amount || !phone) {
    res.status(400);
    throw new Error('service, smartcardNumber, packageCode, phone, and amount are required for cable purchase');
  }
  await handlePurchase({
    res,
    userId: req.user._id,
    amount,
    details: `Cable purchase for ${service}`,
    metadata: { service: 'cable', providerService: service, smartcardNumber, packageCode },
    providerCall: () => vtuProvider.purchaseCable({ service, smartcardNumber, packageCode, phone, amount }),
  });
});

const purchaseElectricity = asyncHandler(async (req, res) => {
  const { distributor, meterNumber, meterType, amount, phone } = req.body;
  if (!distributor || !meterNumber || !amount || !phone) {
    res.status(400);
    throw new Error('Distributor, meterNumber, amount, and phone are required for electricity purchase');
  }
  await handlePurchase({
    res,
    userId: req.user._id,
    amount,
    details: `Electricity purchase for meter ${meterNumber}`,
    metadata: { service: 'electricity', distributor, meterNumber, meterType },
    providerCall: () => vtuProvider.purchaseElectricity({ distributor, meterNumber, meterType, amount, phone }),
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
