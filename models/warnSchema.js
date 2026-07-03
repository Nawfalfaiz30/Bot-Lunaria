const mongoose = require('mongoose');

// Sub-skema untuk setiap teguran (warn)
const warningObjectSchema = new mongoose.Schema({
    // ID Moderator yang memberikan teguran
    moderatorId: { 
        type: String, 
        required: true 
    },
    
    // Alasan mengapa pengguna ini ditegur
    reason: { 
        type: String, 
        default: 'Tidak ada alasan yang diberikan.' 
    },
    
    // Waktu teguran diberikan
    date: { 
        type: Date, 
        default: Date.now 
    }
}); 
// Catatan Penting: Berbeda dengan Inventory, di sini kita TIDAK mematikan _id (biarkan default).
// Mongoose akan otomatis membuatkan _id unik (misal: 64a7b...) untuk setiap teguran ini.
// ID unik ini nantinya akan kita gunakan sebagai "Warn ID" jika Admin ingin menghapus
// satu teguran spesifik menggunakan perintah /removewarn <warn_id>.

const warnSchema = new mongoose.Schema({
    // ID Server tempat teguran ini terjadi
    guildId: { 
        type: String, 
        required: true 
    },

    // ID Pengguna yang menerima teguran
    userId: { 
        type: String, 
        required: true 
    },

    // Daftar riwayat teguran yang diterima pengguna ini
    warnings: [warningObjectSchema]

}, { 
    timestamps: true 
});

// Memastikan hanya ada 1 dokumen per pengguna di 1 server
warnSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Warn', warnSchema);