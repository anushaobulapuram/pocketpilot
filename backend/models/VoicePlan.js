const mongoose = require('mongoose');

const voicePlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalText: { type: String, required: true },
    parsedAmount: { type: Number, required: true },
    parsedDuration: { type: Number, required: true }, // in days
    generatedPlan: {
        dailyAllowed: Number,
        weeklyBudget: Number,
        emergencyBuffer: Number,
        savingsSuggestion: Number,
        categories: {
            essentials: Number,
            food: Number,
            transport: Number,
            savings: Number,
            misc: Number
        }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VoicePlan', voicePlanSchema);
