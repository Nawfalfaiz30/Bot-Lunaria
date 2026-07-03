const mongoose = require('mongoose');

const playerProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    ign: { type: String, default: 'Tidak diatur' },
    favoriteGame: { type: String, default: 'Tidak diatur' },
    platform: { type: String, default: 'Tidak diatur' },
    rank: { type: String, default: 'Tidak diatur' },
    totalHosted: { type: Number, default: 0 }, // Statistik
    totalJoined: { type: Number, default: 0 }  // Statistik
});

module.exports = mongoose.model('PlayerProfile', playerProfileSchema);