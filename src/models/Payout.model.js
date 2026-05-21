const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  method: { type: String, enum: ['bank', 'paypal'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  rejectionReason: String,
  transactionId: String,
}, { timestamps: true });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
