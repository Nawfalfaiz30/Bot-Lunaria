const mongoose = require('mongoose');

// Sub-skema untuk setiap individu peliharaan yang dimiliki pemain
const petObjectSchema = new mongoose.Schema({
    // ID peliharaan yang mengacu pada data statis di data/pets.json (contoh: 'wolf', 'dragon', 'slime')
    petId: { 
        type: String, 
        required: true 
    },
    
    // Nama panggilan kustom yang bisa diatur oleh pemain (contoh: "Guguk", "Si Ganas")
    name: { 
        type: String, 
        default: 'Unnamed Pet' 
    },
    
    // Progresi peliharaan
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    
    // Sistem Interaksi peliharaan
    // 100 = Sangat kenyang, 0 = Kelaparan (Pet yang kelaparan mungkin menolak membantu saat hunt/bossfight)
    hunger: { 
        type: Number, 
        default: 100,
        max: 100,
        min: 0
    },
    
    // 100 = Sangat setia, 0 = Membangkang (Mempengaruhi peluang mendapatkan item bonus atau serangan critical)
    loyalty: { 
        type: Number, 
        default: 50,
        max: 100,
        min: 0
    },

    // Penanda apakah peliharaan ini sedang dipakai/dibawa bertualang (Hanya boleh ada 1 pet yang true)
    isActive: { 
        type: Boolean, 
        default: false 
    }
});

const petSchema = new mongoose.Schema({
    // ID Unik Pengguna Discord
    userId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    
    // Daftar koleksi peliharaan milik pengguna ini
    pets: [petObjectSchema]

}, { 
    timestamps: true 
});

module.exports = mongoose.model('Pet', petSchema);