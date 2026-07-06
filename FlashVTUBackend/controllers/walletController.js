const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const generateReference = require('../utils/generateReference');
const asyncHandler = require('../middleware/asyncHandler');
const flutterwave = require('../services/flutterwaveProvider');

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  res.json(wallet);
});

/**
 * Generates a temporary Flutterwave virtual account for a specific funding amount.
 * The account is single-use and expires once the transfer is received.
 * A pending transaction is created immediately so the webhook can match
 * the incoming payment to the right user by tx_ref.
 */
const createFundingAccount = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('A positive amount is required');
  }

  const reference = generateReference();

  // Create pending transaction first so the webhook can find and credit it
  await Transaction.create({
    user: req.user._id,
    type: 'wallet_fund',
    amount,
    status: 'pending',
    reference,
    provider: 'Flutterwave',
    details: 'Wallet funding via virtual account — awaiting bank transfer',
    metadata: { source: 'virtual_account' },
  });

  const user = req.user;
  const nameParts = (user.name || '').trim().split(' ');
  const firstname = nameParts[0] || 'FlashVTU';
  const lastname = nameParts.slice(1).join(' ') || 'User';

  const accountData = await flutterwave.createTemporaryVirtualAccount({
    email: user.email,
    firstname,
    lastname,
    amount,
    txRef: reference,
  });

  res.json({
    accountNumber: accountData.accountNumber,
    bankName: accountData.bankName,
    amount,
    reference,
    expiryDate: accountData.expiryDate,
    note: accountData.note,
  });
});

/**
 * Step 1: client calls this to get a Flutterwave checkout link.
 * Creates a pending transaction, then asks Flutterwave to initialize a
 * checkout session. The wallet is NOT credited here — only the webhook
 * (primary) or verifyFund (fallback) credits it after Flutterwave confirms.
 */
const initiateFund = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('A positive amount is required');
  }

  const reference = generateReference();

  await Transaction.create({
    user: req.user._id,
    type: 'wallet_fund',
    amount,
    status: 'pending',
    reference,
    provider: 'Flutterwave',
    details: 'Wallet funding initiated — awaiting payment confirmation',
    metadata: { source: 'wallet_fund' },
  });

  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim()
    : null;

  // Pass the reference in the redirect URL so wallet.html can detect
  // the return from checkout and call verifyFund automatically.
  const redirectUrl = frontendUrl
    ? `${frontendUrl}/wallet.html?ref=${reference}`
    : undefined;

  const result = await flutterwave.initializeTransaction({
    email: req.user.email,
    name: req.user.name,
    amount,
    tx_ref: reference,
    redirectUrl,
    metadata: { userId: req.user._id.toString(), reference },
  });

  res.status(200).json({
    message: 'Payment initiated',
    reference,
    paymentUrl: result.link,
  });
});

/**
 * Shared fulfillment logic — credits the wallet for a given reference.
 * Idempotent: if the transaction is already 'success', it's a no-op.
 * Used by both the webhook and the verifyFund fallback.
 *
 * NOTE: Flutterwave amounts are in Naira (no kobo conversion needed).
 */
async function fulfillFunding(reference, flwAmount) {
  const transaction = await Transaction.findOne({ reference });
  if (!transaction) {
    throw new Error(`No transaction found for reference ${reference}`);
  }
  if (transaction.status === 'success') {
    return { transaction, alreadyProcessed: true };
  }

  // Defensive check: Flutterwave confirmed amount must match what we expected.
  if (Math.round(Number(flwAmount)) !== Math.round(transaction.amount)) {
    transaction.status = 'failed';
    transaction.details = `Amount mismatch: expected ₦${transaction.amount}, Flutterwave confirmed ₦${flwAmount}`;
    await transaction.save();
    throw new Error('Payment amount mismatch — transaction flagged as failed');
  }

  let wallet = await Wallet.findOne({ user: transaction.user });
  if (!wallet) {
    wallet = await Wallet.create({ user: transaction.user });
  }

  await wallet.credit(transaction.amount);

  transaction.status = 'success';
  transaction.details = 'Wallet funded via Flutterwave';
  await transaction.save();

  return { transaction, wallet, alreadyProcessed: false };
}

/**
 * Webhook — called by Flutterwave server-to-server after a successful payment.
 * Flutterwave uses a verif-hash header (a plain secret string set in your
 * Flutterwave dashboard), not HMAC-SHA512 like Paystack.
 *
 * Flutterwave docs: https://developer.flutterwave.com/docs/webhooks
 */
const flutterwaveWebhook = asyncHandler(async (req, res) => {
  const headerHash = req.headers['verif-hash'];

  if (!flutterwave.verifyWebhookSignature(headerHash)) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  const { event, data } = req.body;

  // Respond 200 immediately so Flutterwave doesn't retry on a slow fulfillment.
  res.sendStatus(200);

  // We only process completed charges.
  if (event !== 'charge.completed' || data?.status !== 'successful') return;

  try {
    // Always re-verify server-side — never trust the webhook payload amount alone.
    const verified = await flutterwave.verifyTransaction(data.id);
    if (verified.status !== 'successful') return;

    await fulfillFunding(verified.tx_ref, verified.amount);
  } catch (err) {
    console.error(`Flutterwave webhook fulfillment error for tx_ref ${data?.tx_ref}:`, err.message);
  }
});

/**
 * Fallback verification — called by the frontend when the user returns
 * from Flutterwave's checkout via redirect_url (wallet.html?ref=...).
 *
 * The redirect URL carries tx_ref (our reference) and transaction_id
 * (Flutterwave's numeric ID needed to verify). The frontend passes the
 * transaction_id as a query param when calling this endpoint.
 */
const verifyFund = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const { transaction_id } = req.query;

  if (!reference) {
    res.status(400);
    throw new Error('Reference is required');
  }

  const transaction = await Transaction.findOne({ reference, user: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  // Already processed (webhook beat the redirect) — just return the wallet balance.
  if (transaction.status === 'success') {
    const wallet = await Wallet.findOne({ user: req.user._id });
    return res.json({ status: 'success', balance: wallet?.balance, transaction });
  }

  if (!transaction_id) {
    // No transaction_id to verify with — return the pending state.
    return res.json({ status: 'pending', transaction });
  }

  let flwData;
  try {
    flwData = await flutterwave.verifyTransaction(transaction_id);
  } catch (err) {
    res.status(502);
    throw new Error(`Could not verify payment with Flutterwave: ${err.message}`);
  }

  if (flwData.status !== 'successful') {
    if (flwData.status === 'failed') {
      transaction.status = 'failed';
      transaction.details = `Flutterwave reported status: ${flwData.status}`;
      await transaction.save();
    }
    return res.json({ status: flwData.status, transaction });
  }

  const { wallet } = await fulfillFunding(reference, flwData.amount);
  res.json({ status: 'success', balance: wallet?.balance, transaction });
});

const purchase = asyncHandler(async (req, res) => {
  const { amount, serviceCode, target } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('A positive transaction amount is required');
  }

  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }

  const reference = generateReference();

  await Transaction.create({
    user: req.user._id,
    type: 'purchase',
    amount,
    status: 'pending',
    reference,
    provider: 'VTU',
    details: `Purchase created for service ${serviceCode || 'unknown'}`,
    metadata: { target: target || null, serviceCode: serviceCode || null },
  });

  const updatedWallet = await wallet.debit(amount);
  await Transaction.findOneAndUpdate({ reference }, { status: 'success' });

  res.json({
    message: 'Purchase completed successfully',
    balance: updatedWallet.balance,
    reference,
  });
});

module.exports = { getWallet, createFundingAccount, initiateFund, flutterwaveWebhook, verifyFund, purchase };
