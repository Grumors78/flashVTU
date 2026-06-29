const Transaction = require('../models/transactionModel');
const Wallet = require('../models/walletModel');
const paystack = require('./paystackProvider');

/**
 * Reconciliation safety net for wallet_fund transactions.
 *
 * Why this exists: funding normally completes via one of two paths —
 *   1. Paystack's webhook calling POST /api/wallet/webhook/paystack
 *   2. The frontend calling GET /api/wallet/verify-fund/:reference when the
 *      user is redirected back from checkout
 *
 * Both paths are reliable in the common case, but neither is guaranteed:
 * the user can close the tab before the redirect fires, and webhooks can be
 * delayed, dropped, or exhaust their retry attempts on Paystack's side. Any
 * transaction stuck in 'pending' past a reasonable grace period needs someone
 * to actively re-ask Paystack what actually happened — that's this job.
 *
 * Idempotency: this reuses the exact same fulfillFunding-style logic as the
 * webhook/verify paths (credit happens at most once per reference), so it's
 * always safe to run, even if it overlaps with a webhook firing at the same
 * moment for the same transaction.
 */

const STALE_AFTER_MINUTES = 10;
const MAX_RECONCILE_AGE_HOURS = 72; // stop trying after 3 days — investigate manually past this point

/**
 * Mirrors walletController's fulfillFunding. Duplicated rather than imported
 * to avoid a circular dependency between the controller and this service;
 * if you refactor, consider extracting both into a shared module.
 */
async function fulfillFunding(transaction, paystackAmountKobo) {
  if (transaction.status === 'success') {
    return { alreadyProcessed: true };
  }

  const amountNaira = paystack.toNaira(paystackAmountKobo);

  if (Math.round(amountNaira) !== Math.round(transaction.amount)) {
    transaction.status = 'failed';
    transaction.details = `Reconciliation: amount mismatch — expected ₦${transaction.amount}, Paystack confirmed ₦${amountNaira}`;
    await transaction.save();
    return { mismatched: true };
  }

  let wallet = await Wallet.findOne({ user: transaction.user });
  if (!wallet) {
    wallet = await Wallet.create({ user: transaction.user });
  }
  await wallet.credit(amountNaira);

  transaction.status = 'success';
  transaction.details = 'Wallet funded — recovered by reconciliation job';
  await transaction.save();

  return { credited: true, amountNaira };
}

/**
 * Finds pending wallet_fund transactions older than STALE_AFTER_MINUTES,
 * asks Paystack what really happened to each, and resolves them accordingly.
 * Returns a summary object for logging/inspection.
 */
async function reconcilePendingFunding() {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000);
  const maxAgeThreshold = new Date(Date.now() - MAX_RECONCILE_AGE_HOURS * 60 * 60 * 1000);

  const staleTransactions = await Transaction.find({
    type: 'wallet_fund',
    status: 'pending',
    createdAt: { $lte: staleThreshold, $gte: maxAgeThreshold },
  }).limit(50); // cap per run so a backlog can't make one run unbounded

  const summary = {
    checked: staleTransactions.length,
    credited: 0,
    failed: 0,
    stillPending: 0,
    errors: 0,
  };

  for (const transaction of staleTransactions) {
    try {
      const paystackData = await paystack.verifyTransaction(transaction.reference);

      if (paystackData.status === 'success') {
        const result = await fulfillFunding(transaction, paystackData.amount);
        if (result.credited) summary.credited += 1;
        if (result.mismatched) summary.failed += 1;
      } else if (paystackData.status === 'failed' || paystackData.status === 'abandoned') {
        transaction.status = 'failed';
        transaction.details = `Reconciliation: Paystack reported status "${paystackData.status}"`;
        await transaction.save();
        summary.failed += 1;
      } else {
        // Still genuinely pending on Paystack's side (e.g. "ongoing") — leave as is
        summary.stillPending += 1;
      }
    } catch (err) {
      console.error(`Reconciliation error for reference ${transaction.reference}:`, err.message);
      summary.errors += 1;
    }
  }

  // Anything past MAX_RECONCILE_AGE_HOURS and still pending is flagged but
  // left alone — past this point it needs a human, not another retry.
  const abandonedCount = await Transaction.countDocuments({
    type: 'wallet_fund',
    status: 'pending',
    createdAt: { $lt: maxAgeThreshold },
  });
  summary.abandonedNeedingManualReview = abandonedCount;

  return summary;
}

module.exports = { reconcilePendingFunding, STALE_AFTER_MINUTES, MAX_RECONCILE_AGE_HOURS };
