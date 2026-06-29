const asyncHandler = require('../middleware/asyncHandler');
const { reconcilePendingFunding } = require('../services/reconciliationService');

/**
 * Manual trigger for the reconciliation job — admin-only. Useful for
 * debugging or forcing an immediate sweep without waiting for the next
 * scheduled run.
 */
const runReconciliation = asyncHandler(async (req, res) => {
  const summary = await reconcilePendingFunding();
  res.json({ message: 'Reconciliation run complete', summary });
});

module.exports = { runReconciliation };
