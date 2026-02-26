const mongoose = require('mongoose');

const dailySavingsSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    statusColor: { type: String, enum: ['dark_green', 'light_green', 'red', 'gray'], required: true }
}, { timestamps: true });

// Ensure we only have one record per user per day. We will handle the exact Date truncation in the route logic.
dailySavingsSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailySavings', dailySavingsSchema);