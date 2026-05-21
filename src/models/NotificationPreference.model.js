const mongoose = require('mongoose');

const notifPrefSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  inApp: { type: Boolean, default: true },
  types: {
    enrollment: { type: Boolean, default: true },
    review: { type: Boolean, default: true },
    payment: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
}, { timestamps: true });

const NotificationPreference = mongoose.model('NotificationPreference', notifPrefSchema);

module.exports = NotificationPreference;
