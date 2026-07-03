const mongoose = require('mongoose');

const cooldownSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // 🌟 WAJIB ADA: Penjaga batas waktu jatah hadiah harian dan mingguan
  daily: { type: Date, default: null },
  weekly: { type: Date, default: null },

  // Cooldown aktivitas dasar lainnya (Contoh)
  hunt: { type: Date, default: null },
  dungeon: { type: Date, default: null },
  fish: { type: Date, default: null },
  mine: { type: Date, default: null },
  chop: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Cooldown', cooldownSchema);