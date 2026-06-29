const crypto = require('crypto');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const generateReference = require('../utils/generateReference');
const asyncHandler = require('../middleware/asyncHandler');
const paystack = require('../services/paystackProvider');

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  res.json(wallet);
});

/**
 * Step 1 of wallet funding: create a pending transaction, then ask Paystack
 * to initialize a checkout session. The wallet is NOT credited here — only
 * the webhook (or verifyFund, as a fallback) credits it, after Paystack
 * confirms the money actually moved.
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
    provider: 'Paystack',
    details: 'Wallet funding initiated — awaiting payment confirmation',
    metadata: { source: 'wallet_fund' },
  });

  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')[0].trim()
    : null;
  const callbackUrl = frontendUrl ? `${frontendUrl}/wallet.html?ref=${reference}` : undefined;

  const paystackData = await paystack.initializeTransaction({
    email: req.user.email,
    amount,
    reference,
    callbackUrl,
    metadata: { userId: req.user._id.toString(), reference },
  });

  res.status(200).json({
    message: 'Payment initiated',
    reference,
    paymentUrl: paystackData.authorization_url,
    accessCode: paystackData.access_code,
  });
});

/**
 * Shared fulfillment logic — credits the wallet for a given reference exactly
 * once, no matter whether it's called from the webhook or the verify fallback.
 * Idempotent: if the transaction is already 'success', it's a no-op.
 */
async function fulfillFunding(reference, paystackAmountKobo) {
  const transaction = await Transaction.findOne({ reference });
  if (!transaction) {
    throw new Error(`No transaction found for reference ${reference}`);
  }
  if (transaction.status === 'success') {
    return { transaction, alreadyProcessed: true };
  }

  const amountNaira = paystack.toNaira(paystackAmountKobo);

  // Defensive check: the amount Paystack confirms must match what we expected.
  if (Math.round(amountNaira) !== Math.round(transaction.amount)) {
    transaction.status = 'failed';
    transaction.details = `Amount mismatch: expected ₦${transaction.amount}, Paystack confirmed ₦${amountNaira}`;
    await transaction.save();
    throw new Error('Payment amount mismatch — transaction flagged as failed');
  }

  let wallet = await Wallet.findOne({ user: transaction.user });
  if (!wallet) {
    wallet = await Wallet.create({ user: transaction.user });
  }

  await wallet.credit(amountNaira);

  transaction.status = 'success';
  transaction.details = 'Wallet funded via Paystack';
  await transaction.save();

  return { transaction, wallet, alreadyProcessed: false };
}

/**
 * Webhook — called by Paystack server-to-server after a successful payment.
 * Verifies the HMAC signature before trusting the payload, per Paystack's
 * webhook security guidance: https://paystack.com/docs/payments/webhooks/
 */
const paystackWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];

  const hash = crypto
    .createHmac('sha512', secret)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest('hex');

  if (!signature || hash !== signature) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const { event, data } = req.body;

  // Always respond 200 quickly once verified — Paystack retries on non-2xx.
  res.sendStatus(200);

  if (event !== 'charge.success') return;

  try {
    await fulfillFunding(data.reference, data.amount);
  } catch (err) {
    // Log only — response already sent. A failed fulfillment here can be
    // reconciled later via the verify endpoint using the same reference.
    console.error(`Webhook fulfillment error for ${data.reference}:`, err.message);
  }
});

/**
 * Fallback verification — used when the user is redirected back to
 * wallet.html?ref=... via the callback_url. Lets the frontend confirm
 * payment immediately without waiting on the webhook.
 */
const verifyFund = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  if (!reference) {
    res.status(400);
    throw new Error('Reference is required');
  }

  const transaction = await Transaction.findOne({ reference, user: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'success') {
    const wallet = await Wallet.findOne({ user: req.user._id });
    return res.json({ status: 'success', balance: wallet?.balance, transaction });
  }

  const paystackData = await paystack.verifyTransaction(reference);

  if (paystackData.status !== 'success') {
    if (paystackData.status === 'failed' || paystackData.status === 'abandoned') {
      transaction.status = 'failed';
      transaction.details = `Paystack reported status: ${paystackData.status}`;
      await transaction.save();
    }
    return res.json({ status: paystackData.status, transaction });
  }

  const { wallet } = await fulfillFunding(reference, paystackData.amount);
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

module.exports = { getWallet, initiateFund, paystackWebhook, verifyFund, purchase };
