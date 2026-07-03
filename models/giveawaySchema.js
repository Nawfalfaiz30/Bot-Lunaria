const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    // Lokasi di mana giveaway ini diadakan
    guildId: { 
        type: String, 
        required: true 
    },
    channelId: { 
        type: String, 
        required: true 
    },
    
    // ID Pesan dari panel giveaway (Digunakan sebagai kunci utama pencarian)
    messageId: { 
        type: String, 
        required: true, 
        unique: true 
    },

    // ID pengguna/admin yang mensponsori atau mengadakan giveaway
    hostId: { 
        type: String, 
        required: true 
    },

    // Nama hadiah yang diperebutkan (contoh: "Nitro 1 Bulan", "100.000 Koin RPG")
    prize: { 
        type: String, 
        required: true 
    },

    // Jumlah pemenang yang akan dipilih
    winnersCount: { 
        type: Number, 
        required: true, 
        default: 1 
    },

    // Kapan giveaway ini akan berakhir dan pemenang diundi
    endTime: { 
        type: Date, 
        required: true 
    },

    // Status apakah giveaway sudah selesai atau belum
    hasEnded: { 
        type: Boolean, 
        default: false 
    },

    // (Opsional/Keamanan) Menyimpan ID pengguna yang ikut serta. 
    // Ini sangat berguna jika Anda menggunakan tombol (Button) alih-alih Reaksi (Reaction) 
    // untuk menghindari rate limit Discord.
    entries: { 
        type: [String], 
        default: [] 
    },

    // Menyimpan daftar ID pemenang setelah giveaway berakhir
    winners: { 
        type: [String], 
        default: [] 
    }

}, { 
    timestamps: true 
});

module.exports = mongoose.model('Giveaway', giveawaySchema);