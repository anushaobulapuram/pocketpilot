const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain' },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    source: { type: String, enum: ['manual', 'voice', 'sms'], default: 'manual' },
    date: { type: Date, default: Date.now },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
