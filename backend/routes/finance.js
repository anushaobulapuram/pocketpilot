const express = require('express');
const mongoose = require('mongoose');
const Domain = require('../models/Domain');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const DailySavings = require('../models/DailySavings');
const BudgetPlan = require('../models/BudgetPlan');
const VoicePlan = require('../models/VoicePlan');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// Domains
router.get('/domains', authenticate, async (req, res) => {
    try {
        const domains = await Domain.find({ user: req.user.id });
        res.json(domains.map(d => ({
            id: d._id,
            name: d.name,
            expected_amount: d.expectedAmount
        })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/domains', authenticate, async (req, res) => {
    const { name, expected_amount } = req.body;
    if (!name || expected_amount === undefined) return res.status(400).json({ error: 'Missing fields' });

    try {
        const newDomain = new Domain({
            user: req.user.id,
            name,
            expectedAmount: expected_amount
        });
        await newDomain.save();
        res.status(201).json({ id: newDomain._id, name, expected_amount });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Transactions
router.post('/transactions', authenticate, async (req, res) => {
    const { domain_id, goal_id, amount, type, description, source } = req.body;

    if (!amount || !type) return res.status(400).json({ error: 'Amount and type are required' });
    if (type === 'expense' && !domain_id) return res.status(400).json({ error: 'Category is required for expense' });

    try {
        const newTx = new Transaction({
            user: req.user.id,
            domain: domain_id || null,
            goal: goal_id || null,
            amount,
            type,
            source: source || 'manual',
            description: description || ''
        });
        await newTx.save();
        res.status(201).json({ id: newTx._id, message: 'Transaction added' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/transactions/sms', authenticate, async (req, res) => {
    const { amount, type, domain_id } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid positive amount is required' });
    if (!type || !['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Valid type is required' });
    if (type === 'expense' && !domain_id) return res.status(400).json({ error: 'Category (domain_id) is required for expense' });

    try {
        // Prevent duplicate save by checking recent identical SMS transactions in the last minute
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const duplicateTx = await Transaction.findOne({
            user: req.user.id,
            amount,
            type,
            source: 'sms',
            date: { $gte: oneMinuteAgo }
        });

        if (duplicateTx) {
            return res.status(409).json({ error: 'Duplicate SMS transaction detected recently' });
        }

        const newTx = new Transaction({
            user: req.user.id,
            domain: domain_id || null,
            amount,
            type,
            source: 'sms',
            description: 'Saved via SMS Simulation'
        });
        await newTx.save();
        res.status(201).json({ id: newTx._id, message: 'SMS Transaction saved successfully', transaction: newTx });
    } catch (err) {
        console.error("SMS Save Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id })
            .populate('domain', 'name')
            .sort({ date: -1 });

        res.json(transactions.map(t => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            date: t.date,
            source: t.source || 'manual',
            description: t.description,
            domain_name: t.domain ? t.domain.name : '-'
        })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Dashboard Summary (Mongoose Aggregation pipeline)
router.get('/summary', authenticate, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        // Income and Expense Totals
        const totals = await Transaction.aggregate([
            { $match: { user: userId } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ]);

        let total_income = 0;
        let total_expense = 0;
        totals.forEach(t => {
            if (t._id === 'income') total_income = t.total;
            if (t._id === 'expense') total_expense = t.total;
        });

        // Domain Breakdown
        const domainExpenses = await Transaction.aggregate([
            { $match: { user: userId, type: 'expense', domain: { $ne: null } } },
            { $group: { _id: '$domain', spent_amount: { $sum: '$amount' } } }
        ]);

        const domains = await Domain.find({ user: userId });

        const domain_breakdown = domains.map(d => {
            const expenseRecord = domainExpenses.find(e => e._id.toString() === d._id.toString());
            const spent_amount = expenseRecord ? expenseRecord.spent_amount : 0;
            return {
                id: d._id,
                name: d.name,
                expected_amount: d.expectedAmount,
                spent_amount,
                remaining_amount: d.expectedAmount - spent_amount
            };
        });

        res.json({
            total_income,
            total_expense,
            current_balance: total_income - total_expense,
            domain_breakdown
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Daily Savings Performance Indicator
router.get('/daily-performance', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Fetch user's primary goal
        const goal = await Goal.findOne({ user: userId }).sort({ createdAt: -1 });
        if (!goal) {
            return res.json({ status: 'gray', tooltip: 'Set a goal to track daily performance.' });
        }

        // 2. Calculate Goal Per Day
        const goalPerDay = goal.targetAmount / (goal.months * 30);

        // 3. Query today's transactions
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todaysTransactions = await Transaction.find({
            user: userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        // 4. Calculate Income Per Day (Today's Net Savings)
        let totalIncomeToday = 0;
        let totalExpenseToday = 0;

        todaysTransactions.forEach(t => {
            if (t.type === 'income') totalIncomeToday += t.amount;
            if (t.type === 'expense') totalExpenseToday += t.amount;
        });

        const incomePerDay = totalIncomeToday - totalExpenseToday;

        // 5. Apply Color Logic
        let status = 'gray';
        let tooltip = '';

        if (incomePerDay <= 0 || incomePerDay < goalPerDay) {
            status = 'red';
            tooltip = 'You did not meet your daily savings goal today.';
        } else if (incomePerDay >= 2 * goalPerDay) {
            status = 'dark_green';
            tooltip = 'You saved more than double your daily goal today.';
        } else {
            status = 'light_green';
            tooltip = 'You met your daily savings goal today.';
        }

        // Upsert into Daily Savings Collection
        // Truncate to midnight strictly
        const todayRecord = new Date();
        todayRecord.setHours(0, 0, 0, 0);

        await DailySavings.findOneAndUpdate(
            { user: userId, date: todayRecord },
            { statusColor: status },
            { upsert: true, new: true }
        );

        res.json({ status, goalPerDay, incomePerDay, tooltip });
    } catch (err) {
        console.error("Daily Performance Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Daily Savings History
router.get('/daily-history', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

        const history = await DailySavings.find({
            user: userId,
            date: { $gte: startOfYear, $lte: endOfYear }
        }).sort({ date: 1 }).select('date statusColor -_id');

        res.json(history);
    } catch (err) {
        console.error("Daily History Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Budget Plans
router.post('/budget-plan', authenticate, async (req, res) => {
    const { totalBudget, days, domains, planBreakdown } = req.body;

    if (!totalBudget || !days || !domains || !planBreakdown) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const newPlan = new BudgetPlan({
            user: req.user.id,
            totalBudget,
            days,
            domains,
            planBreakdown
        });
        await newPlan.save();
        res.status(201).json({ id: newPlan._id, message: 'Budget plan saved successfully' });
    } catch (err) {
        console.error("Budget Plan Save Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Voice Plans
router.post('/voice-plan', authenticate, async (req, res) => {
    const { originalText, parsedAmount, parsedDuration, generatedPlan } = req.body;

    if (!originalText || !parsedAmount || !parsedDuration || !generatedPlan) {
        return res.status(400).json({ error: 'Missing required voice plan fields' });
    }

    try {
        const newVoicePlan = new VoicePlan({
            userId: req.user.id,
            originalText,
            parsedAmount,
            parsedDuration,
            generatedPlan
        });
        await newVoicePlan.save();
        res.status(201).json({ id: newVoicePlan._id, message: 'Voice plan saved successfully' });
    } catch (err) {
        console.error("Voice Plan Save Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/voice-plan/latest', authenticate, async (req, res) => {
    try {
        const latestPlan = await VoicePlan.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
        if (!latestPlan) {
            return res.status(404).json({ message: 'No plans found' });
        }
        res.json(latestPlan);
    } catch (err) {
        console.error("Voice Plan Fetch Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
