const express = require('express');
const Goal = require('../models/Goal');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
    const { name, target_amount, months } = req.body;

    if (!name || !target_amount || !months) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const newGoal = new Goal({
            user: req.user.id,
            name,
            targetAmount: target_amount,
            months
        });

        await newGoal.save();
        res.status(201).json({ id: newGoal._id, message: 'Goal created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });

        const goalsWithCalc = goals.map(g => {
            const monthly_savings = g.targetAmount / g.months;
            const daily_savings = monthly_savings / 30;
            return {
                id: g._id,
                name: g.name,
                target_amount: g.targetAmount,
                months: g.months,
                monthly_savings: monthly_savings.toFixed(2),
                daily_savings: daily_savings.toFixed(2)
            };
        });

        res.json(goalsWithCalc);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
