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
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

walletSchema.methods.credit = async function (amount) {
  this.balance += amount;
  this.updatedAt = Date.now();
  return this.save();
};

walletSchema.methods.debit = async function (amount) {
  if (amount > this.balance) {
    throw new Error('Insufficient wallet balance');
  }
  this.balance -= amount;
  this.updatedAt = Date.now();
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);
