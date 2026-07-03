const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    // ---------------------------------------------------
    // IDENTITAS SERVER
    // ---------------------------------------------------
    guildId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    prefix: { 
        type: String, 
        default: 'ln!' 
    },

    // ---------------------------------------------------
    // PENGATURAN LOG & MODERASI
    // ---------------------------------------------------
    logChannel: { 
        type: String, 
        default: null 
    },
    // FIX INTEGRASI: Menambahkan penampung channel khusus log sistem giveaway
    giveawayLogChannel: {
        type: String,
        default: null
    },
    autoRole: {
        type: String,
        default: null
    },
    muteRole: {
        type: String,
        default: null
    },
    blacklistedUsers: {
        type: Array,
        default: []
    },

    // ---------------------------------------------------
    // PENGATURAN VISUAL KANVAS (MEMBER EVENTS)
    // ---------------------------------------------------
    welcomeChannel: { 
        type: String, 
        default: null 
    },
    welcomeMessage: { 
        type: String, 
        default: null 
    },
    goodbyeChannel: { 
        type: String, 
        default: null 
    },
    goodbyeMessage: { 
        type: String, 
        default: null 
    },
    boostChannel: { 
        type: String, 
        default: null 
    },

    // ---------------------------------------------------
    // PENGATURAN TICKET SYSTEM
    // ---------------------------------------------------
    ticketCategory: { 
        type: String, 
        default: null 
    },
    ticketLogChannel: { 
        type: String, 
        default: null 
    },
    ticketSupportRole: {
        type: String,
        default: null
    },

    // ---------------------------------------------------
    // PENGATURAN CONFESS (MENFESS) SYSTEM
    // ---------------------------------------------------
    confessChannel: { 
        type: String, 
        default: null 
    },
    confessLogChannel: { 
        type: String, 
        default: null 
    },

    // ---------------------------------------------------
    // PENGATURAN FITUR TAMBAHAN LAINNYA
    // ---------------------------------------------------
    voiceGeneratorChannel: {
        type: String,
        default: null
    },
    animeChannel: {
        type: String,
        default: null
    }
    
}, { 
    timestamps: true 
});

module.exports = mongoose.model('GuildSettings', guildSchema);