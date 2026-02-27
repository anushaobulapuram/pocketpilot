const VoicePlan = require('../models/VoicePlan');
const Goal = require('../models/Goal'); // Might be needed for reference, though optional
const FinanceSummary = require('../models/FinanceSummary');

// @desc    Save a generated voice budget plan
// @route   POST /api/finance/voice-plan
// @access  Private
exports.saveVoicePlan = async (req, res) => {
    try {
        const {
            originalText,
            parsedAmount,
            parsedDuration,
            generatedPlan
        } = req.body;

        if (!originalText || !parsedAmount || !parsedDuration || !generatedPlan) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const newVoicePlan = new VoicePlan({
            userId: req.user.id,
            originalText,
            parsedAmount,
            parsedDuration,
            generatedPlan
        });

        await newVoicePlan.save();

        res.status(201).json(newVoicePlan);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get the user's latest voice budget plan
// @route   GET /api/finance/voice-plan/latest
// @access  Private
exports.getLatestVoicePlan = async (req, res) => {
    try {
        const voicePlan = await VoicePlan.findOne({ userId: req.user.id })
            .sort({ createdAt: -1 });

        if (!voicePlan) {
            return res.status(404).json({ message: 'No voice plan found' });
        }

        res.json(voicePlan);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get all user's voice budget plans
// @route   GET /api/finance/voice-plan
// @access  Private
exports.getAllVoicePlans = async (req, res) => {
    try {
        const voicePlans = await VoicePlan.find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.json(voicePlans);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};
