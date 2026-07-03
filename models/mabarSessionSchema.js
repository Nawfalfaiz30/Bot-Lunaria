const mongoose = require('mongoose');

const mabarSessionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    hostId: { type: String, required: true },
    gameName: { type: String, required: true },
    maxPlayers: { type: Number, required: true },
    players: { type: [String], default: [] }, // Array berisi ID orang yang ikut
    channelId: { type: String, required: true },
    messageId: { type: String, required: true }, // ID Pesan untuk mengedit tombol nanti
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MabarSession', mabarSessionSchema);