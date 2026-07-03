const mongoose = require('mongoose');

const gameProfileSchema = new mongoose.Schema({
    // ID Unik Pengguna Discord
    userId: { 
        type: String, 
        required: true, 
        unique: true 
    },

    // ---------------------------------------------------
    // STATISTIK PERMAINAN PAPAN (BOARD GAMES)
    // ---------------------------------------------------
    uno: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 }
    },
    
    chess: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        elo: { type: Number, default: 1000 } // Sistem ranking sederhana untuk Catur
    },

    connect4: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 }
    },

    tictactoe: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 }
    },

    // ---------------------------------------------------
    // STATISTIK TEBAK KATA / LOGIKA
    // ---------------------------------------------------
    wordle: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 }, // Kemenangan beruntun saat ini
        maxStreak: { type: Number, default: 0 }      // Rekor kemenangan beruntun tertinggi
    },

    hangman: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
    },

    minesweeper: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
    }

}, { 
    timestamps: true 
});

module.exports = mongoose.model('GameProfile', gameProfileSchema);