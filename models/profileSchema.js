// D:\Lunaria_New 2\models\profileSchema.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    afk: {
        isAfk: { type: Boolean, default: false },
        reason: { type: String, default: null },
        timestamp: { type: Number, default: null },
        mentions: [{
            userId: String,
            channelId: String,
            content: String,
            timestamp: { type: Number, default: Date.now }
        }]
    }
});

module.exports = mongoose.model('Profile', profileSchema);