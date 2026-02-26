const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    profilePhoto: { type: String, default: '' },
    preferences: {
        theme: { type: String, default: 'light' },
        language: { type: String, default: 'en' }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
