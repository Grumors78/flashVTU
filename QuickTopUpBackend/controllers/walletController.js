const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const generateReference = require('../utils/generateReference');
const asyncHandler = require('../middleware/asyncHandler');

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  res.json(wallet);
});

/**
 * Wallet funding via Paystack/Flutterwave works in two steps:
 *
 *  1. Client calls POST /api/wallet/initiate-fund to get a payment link.
 *  2. Payment provider calls POST /api/wallet/webhook after the user pays.
 *     Only the webhook actually credits the wallet.
 *
 * The old single-step fundWallet was replaced because it credited the wallet
 * without any proof of payment, making it trivially exploitable.
 */
const initiateFund = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('A positive amount is required');
  }

  const reference = generateReference();

  // Create a PENDING transaction so we can reconcile it when the webhook arrives
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

  // TODO: call Paystack/Flutterwave initialise API here and return the
  // payment URL to the client. Example (Paystack):
  //
  //   const paystackRes = await axios.post(
  //     'https://api.paystack.co/transaction/initialize',
  //     { email: req.user.email, amount: amount * 100, reference },
  //     { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  //   );
  //   return res.json({ paymentUrl: paystackRes.data.data.authorization_url, reference });

  res.status(200).json({
    message: 'Payment initiation placeholder — integrate Paystack/Flutterwave here',
    reference,
  });
});

/**
 * Webhook handler — called by Paystack/Flutterwave after a successful payment.
 * Credits the wallet only when the provider confirms the transaction.
 *
 * In production you MUST verify the webhook signature before trusting the payload.
 * See: https://paystack.com/docs/payments/webhooks/
 */
const paystackWebhook = asyncHandler(async (req, res) => {
  // TODO: verify HMAC signature
  // const hash = crypto
  //   .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
  //   .update(JSON.stringify(req.body))
  //   .digest('hex');
  // if (hash !== req.headers['x-paystack-signature']) {
  //   return res.status(401).json({ message: 'Invalid signature' });
  // }

  const { event, data } = req.body;
  if (event !== 'charge.success') return res.sendStatus(200);

  const { reference, amount } = data;
  const amountNGN = amount / 100; // Paystack sends kobo

  const transaction = await Transaction.findOne({ reference });
  if (!transaction || transaction.status === 'success') {
    // Already processed or unknown reference — respond 200 so provider stops retrying
    return res.sendStatus(200);
  }

  let wallet = await Wallet.findOne({ user: transaction.user });
  if (!wallet) {
    wallet = await Wallet.create({ user: transaction.user });
  }

  await wallet.credit(amountNGN);

  transaction.status = 'success';
  transaction.details = 'Wallet funded via Paystack webhook';
  await transaction.save();

  res.sendStatus(200);
});

/**
 * Generic purchase deduct — used by the wallet purchase route.
 * VTU-specific purchases go through vtuController instead.
 */
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

  // Atomic debit — throws 'Insufficient wallet balance' if funds are too low
  const updatedWallet = await wallet.debit(amount);

  await Transaction.findOneAndUpdate({ reference }, { status: 'success' });

  res.json({
    message: 'Purchase completed successfully',
    balance: updatedWallet.balance,
    reference,
  });
});

module.exports = { getWallet, initiateFund, paystackWebhook, purchase };
