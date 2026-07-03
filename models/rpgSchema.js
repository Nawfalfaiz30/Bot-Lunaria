const mongoose = require('mongoose');

const rpgSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  class: { type: String, default: null },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  gold: { type: Number, default: 0 }, // Tetap Number agar pembukuan matematika lancar
  hp: { type: Number, default: 100 },
  mana: { type: Number, default: 20 },
  current_area: { type: Number, default: 1 },
  max_area: { type: Number, default: 1 },
  timetravel_count: { type: Number, default: 0 },

  // 🌟 Struktur penampung kuota mantera aktif
  active_skill: {
    id: { type: String, default: null },
    uses_left: { type: Number, default: 0 }
  },

  // Struktur perlengkapan (Slot Equipment)
  equipment: {
    weapon: { type: String, default: null },
    armor: { type: String, default: null },
    fishing_rod: { type: String, default: null },
    pickaxe: { type: String, default: null },
    axe: { type: String, default: null }
  },
  
  // Tingkat tempa kustom terikat ID spesifik
  refine: { type: mongoose.Schema.Types.Mixed, default: {} },

  // 🧪 PERBAIKAN: Struktur penampung efek alkimia & skill aktif yang sudah disinkronkan
  buffs: [{
    itemName: { type: String, required: true },   // 🌟 BARU: Menampung nama skill/ramuan
    statTarget: { type: String, required: true },
    value: { type: Number, required: true },
    type: { type: String, required: true },        // 'flat' atau 'percent'
    duration: { type: Number, required: true },    // 🌟 BARU: Menampung durasi milidetik
    expiresAt: { type: Date, required: true }
  }],

  // Bonus permanen dari dapur memasak (Cook)
  permanent_bonus: {
    str: { type: Number, default: 0 },
    agi: { type: Number, default: 0 },
    int: { type: Number, default: 0 },
    vit: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('RPG', rpgSchema);