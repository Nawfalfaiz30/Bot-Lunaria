const mongoose = require('mongoose');

const confessBanSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, default: 'Melanggar aturan server' },
    bannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConfessBan', confessBanSchema);