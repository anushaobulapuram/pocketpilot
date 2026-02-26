const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    expectedAmount: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Domain', domainSchema);
