const mongoose = require('mongoose');

const securitySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    ghostPingProtection: { type: Boolean, default: false },
    antiLink: { type: Boolean, default: false },
    antiNuke: { type: Boolean, default: false },
    antiRaid: { type: Boolean, default: false },
    autoMod: { type: Boolean, default: false },
    // TAMBAHKAN BARIS INI: Array untuk menyimpan daftar kata kasar terlarang
    badwords: { type: [String], default: [] }, 
    verifiedRole: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Security', securitySchema);