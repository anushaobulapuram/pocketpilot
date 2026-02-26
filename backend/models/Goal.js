const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    months: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
