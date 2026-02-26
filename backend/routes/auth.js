const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pocketpilot_secret_key';

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            passwordHash
        });

        await newUser.save();
        res.status(201).json({ message: 'Account created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePhoto: user.profilePhoto,
                language: user.preferences.language,
                theme: user.preferences.theme
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            profilePhoto: user.profilePhoto,
            language: user.preferences.language,
            theme: user.preferences.theme
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/profile', authenticate, async (req, res) => {
    const { language, theme, email, password, profilePhoto } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (language) user.preferences.language = language;
        if (theme) user.preferences.theme = theme;
        if (email) user.email = email;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
        if (password) {
            user.passwordHash = await bcrypt.hash(password, 10);
        }

        await user.save();
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: 'Database update failed' });
    }
});

module.exports = router;
