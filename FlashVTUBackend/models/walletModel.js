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
    /**
     * Permanent Flutterwave virtual account assigned to this wallet.
     * Generated once on first funding request and stored here permanently.
     * Users transfer to this account number anytime to fund their wallet.
     */
    virtualAccount: {
      accountNumber: { type: String, default: null },
      bankName: { type: String, default: null },
      flwRef: { type: String, default: null },
      createdAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

walletSchema.methods.credit = async function (amount) {
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $inc: { balance: amount } },
    { new: true, runValidators: true }
  );
  this.balance = updated.balance;
  return updated;
};

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
