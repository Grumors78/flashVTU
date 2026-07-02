const Transaction = require('../models/transactionModel');
const Wallet = require('../models/walletModel');
const flutterwave = require('./flutterwaveProvider');

/**
 * Reconciliation safety net for wallet_fund transactions.
 * Updated to use Flutterwave instead of Paystack.
 *
 * Flutterwave verification for reconciliation uses verifyByReference
 * (GET /v3/transactions/verify_by_reference?tx_ref=...) since we only
 * have our own tx_ref — not Flutterwave's numeric transaction_id — for
 * older pending transactions that the webhook/redirect never resolved.
 */

const STALE_AFTER_MINUTES = 10;
const MAX_RECONCILE_AGE_HOURS = 72;

async function fulfillFunding(transaction, flwAmount) {
  if (transaction.status === 'success') {
    return { alreadyProcessed: true };
  }

  const amount = Number(flwAmount);

  if (Math.round(amount) !== Math.round(transaction.amount)) {
    transaction.status = 'failed';
    transaction.details = `Reconciliation: amount mismatch — expected ₦${transaction.amount}, Flutterwave confirmed ₦${amount}`;
    await transaction.save();
    return { mismatched: true };
  }

  let wallet = await Wallet.findOne({ user: transaction.user });
  if (!wallet) {
    wallet = await Wallet.create({ user: transaction.user });
  }
  await wallet.credit(transaction.amount);

  transaction.status = 'success';
  transaction.details = 'Wallet funded — recovered by reconciliation job';
  await transaction.save();

  return { credited: true, amount };
}

async function reconcilePendingFunding() {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000);
  const maxAgeThreshold = new Date(Date.now() - MAX_RECONCILE_AGE_HOURS * 60 * 60 * 1000);

  const staleTransactions = await Transaction.find({
    type: 'wallet_fund',
    status: 'pending',
    createdAt: { $lte: staleThreshold, $gte: maxAgeThreshold },
  }).limit(50);

  const summary = {
    checked: staleTransactions.length,
    credited: 0,
    failed: 0,
    stillPending: 0,
    errors: 0,
  };

  for (const transaction of staleTransactions) {
    try {
      // Use verifyByReference since we only have tx_ref, not transaction_id
      const flwData = await flutterwave.verifyByReference(transaction.reference);

      if (flwData.status === 'successful') {
        const result = await fulfillFunding(transaction, flwData.amount);
        if (result.credited) summary.credited += 1;
        if (result.mismatched) summary.failed += 1;
      } else if (flwData.status === 'failed') {
        transaction.status = 'failed';
        transaction.details = `Reconciliation: Flutterwave reported status "failed"`;
        await transaction.save();
        summary.failed += 1;
      } else {
        // Still genuinely pending on Flutterwave's side
        summary.stillPending += 1;
      }
    } catch (err) {
      console.error(`Reconciliation error for reference ${transaction.reference}:`, err.message);
      summary.errors += 1;
    }
  }

  const abandonedCount = await Transaction.countDocuments({
    type: 'wallet_fund',
    status: 'pending',
    createdAt: { $lt: maxAgeThreshold },
  });
  summary.abandonedNeedingManualReview = abandonedCount;

  return summary;
}

module.exports = { reconcilePendingFunding, STALE_AFTER_MINUTES, MAX_RECONCILE_AGE_HOURS };
