const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ID Unik Pengguna Discord (Wajib ada)
    userId: { 
        type: String, 
        required: true, 
        unique: true 
    },

    // ---------------------------------------------------
    // EKONOMI GLOBAL
    // ---------------------------------------------------
    // Koin di tangan (bisa digunakan untuk belanja, tapi rawan fitur /rob)
    balance: { 
        type: Number, 
        default: 0 
    },
    // Koin di bank (aman, tapi mungkin membutuhkan biaya transfer/pajak)
    bank: { 
        type: Number, 
        default: 0 
    },

    // ---------------------------------------------------
    // PROFIL & UTILITAS
    // ---------------------------------------------------
    // Teks bio untuk ditampilkan di command userinfo atau profile
    bio: { 
        type: String, 
        default: 'Saya adalah pengguna setia Lunaria!' 
    },
    
    // Jika true, pengguna ini diblokir total dari menggunakan perintah bot apa pun
    isBlacklisted: { 
        type: Boolean, 
        default: false 
    },

    // ---------------------------------------------------
    // COOLDOWN HARIAN UMUM
    // ---------------------------------------------------
    // Mencatat kapan terakhir kali pengguna mengambil /daily (Klaim harian)
    dailyCooldown: { 
        type: Date, 
        default: null 
    }
    
}, { 
    // Otomatis mencatat kapan akun pertama kali terdaftar (createdAt) dan diubah (updatedAt)
    timestamps: true 
});

module.exports = mongoose.model('User', userSchema);