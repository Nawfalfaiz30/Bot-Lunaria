const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    // ID Server tempat tiket ini dibuat
    guildId: { 
        type: String, 
        required: true 
    },

    // ID Pengguna yang menekan tombol "Buka Tiket"
    userId: { 
        type: String, 
        required: true 
    },

    // ID Channel Private (rahasia) tempat percakapan tiket berlangsung
    channelId: { 
        type: String, 
        required: true, 
        unique: true 
    },

    // Status tiket saat ini (terbuka atau tertutup)
    status: { 
        type: String, 
        enum: ['open', 'closed'], 
        default: 'open' 
    },

    // ID Admin/Moderator yang sedang menangani tiket ini (berguna jika tim admin banyak)
    claimedBy: { 
        type: String, 
        default: null 
    }

}, { 
    // Otomatis mencatat kapan tiket dibuat dan kapan terakhir kali ada pembaruan status
    timestamps: true 
});

module.exports = mongoose.model('Ticket', ticketSchema);    