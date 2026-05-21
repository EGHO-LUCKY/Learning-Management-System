const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['sale', 'payout', 'refund'], required: true },
  amount: { type: Number, required: true }, // positive for earnings, negative for payouts/refunds
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  description: String,
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  payout: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
