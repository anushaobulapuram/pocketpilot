const mongoose = require('mongoose');

const budgetPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalBudget: { type: Number, required: true },
    days: { type: Number, required: true },
    domains: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Domain' }],
    planBreakdown: [{
        domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain' },
        domainName: { type: String },
        dailyLimit: { type: Number },
        totalLimit: { type: Number }
    }],
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BudgetPlan', budgetPlanSchema);
