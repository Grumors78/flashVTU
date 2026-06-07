const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['wallet_fund', 'purchase', 'refund', 'commission'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  reference: {
    type: String,
    required: true,
    unique: true,
  },
  provider: {
    type: String,
    default: 'internal',
  },
  details: {
    type: String,
    default: '',
  },
  metadata: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
