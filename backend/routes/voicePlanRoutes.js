const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const voicePlanController = require('../controllers/voicePlanController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/finance/voice-plan
router.post('/', voicePlanController.saveVoicePlan);

// GET /api/finance/voice-plan
router.get('/', voicePlanController.getAllVoicePlans);

// GET /api/finance/voice-plan/latest
router.get('/latest', voicePlanController.getLatestVoicePlan);

module.exports = router;
