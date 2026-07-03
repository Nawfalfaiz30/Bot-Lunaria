const cron = require('node-cron');
const giveawaySchema = require('../models/giveawaySchema');
const { EmbedBuilder } = require('discord.js');
const logger = require('../helpers/logger');

module.exports = (client) => {
    // Berjalan setiap 30 detik
    cron.schedule('*/30 * * * * *', async () => {
        try {
            const sekarang = Date.now();
            const giveawayAktif = await giveawaySchema.find({ endTime: { $lte: sekarang }, ended: false });
            if (giveawayAktif.length === 0) return;

            // ... Logika pengundian hadiahmu di sini ...
            
        } catch (error) {
            logger.error('Gagal menjalankan cron job giveawayCheck:', error);
        }
    }, { scheduled: true, timezone: "Asia/Jakarta" });
};