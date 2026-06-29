const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    // NOTE: updatedAt is removed here — { timestamps: true } below provides
    // both createdAt and updatedAt automatically. Having both caused a duplicate
    // field conflict where the manual field shadowed the Mongoose-managed one.
  },
  { timestamps: true }
);

/**
 * Credit the wallet by `amount`.
 * Uses findOneAndUpdate for atomicity — avoids lost-update races under concurrency.
 */
walletSchema.methods.credit = async function (amount) {
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $inc: { balance: amount } },
    { new: true, runValidators: true }
  );
  this.balance = updated.balance;
  return updated;
};

/**
 * Debit the wallet by `amount`.
 * Atomic check-and-decrement: only succeeds when balance >= amount,
 * preventing double-spend races between concurrent requests.
 */
walletSchema.methods.debit = async function (amount) {
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, runValidators: true }
  );
  if (!updated) {
    throw new Error('Insufficient wallet balance');
  }
  this.balance = updated.balance;
  return updated;
};

module.exports = mongoose.model('Wallet', walletSchema);
