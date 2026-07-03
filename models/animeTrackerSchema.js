const mongoose = require('mongoose');

// Sub-skema untuk mencatat server dan channel mana saja yang berlangganan anime ini
const subscriptionSchema = new mongoose.Schema({
    guildId: { 
        type: String, 
        required: true 
    },
    // Channel tempat bot akan mengirim pesan notifikasi rilis episode baru
    channelId: { 
        type: String, 
        required: true 
    }
}, { 
    _id: false // Dimatikan agar tidak boros memori
});

const animeTrackerSchema = new mongoose.Schema({
    // ID Anime dari database eksternal (misalnya menggunakan ID dari MyAnimeList atau AniList)
    animeId: { 
        type: String, 
        required: true,
        unique: true
    },

    // Judul anime (untuk mempermudah pembacaan di database tanpa harus melakukan fetch ke API)
    title: { 
        type: String, 
        required: true 
    },

    // Daftar server dan channel yang menantikan notifikasi anime ini
    subscribedChannels: [subscriptionSchema],

    // Mencatat episode terakhir yang sudah diumumkan agar bot tidak mengirim notifikasi ganda/spam
    lastEpisodeNotified: { 
        type: Number, 
        default: 0 
    },

    // Status anime saat ini. Jika sudah tamat ('completed'), 
    // cronjobs bot tidak perlu lagi mengecek pembaruannya ke API untuk menghemat bandwidth.
    status: { 
        type: String, 
        enum: ['airing', 'completed', 'cancelled'], 
        default: 'airing' 
    }

}, { 
    timestamps: true 
});

module.exports = mongoose.model('AnimeTracker', animeTrackerSchema);