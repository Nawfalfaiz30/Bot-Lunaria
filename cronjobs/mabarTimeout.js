const cron = require('node-cron');
const mabarSessionSchema = require('../models/mabarSessionSchema');
const logger = require('../helpers/logger');

module.exports = (client) => {
    // Berjalan setiap 5 menit
    cron.schedule('*/5 * * * *', async () => {
        try {
            const batasWaktu = new Date(Date.now() - 30 * 60 * 1000);
            const sesiKedaluwarsa = await mabarSessionSchema.find({ createdAt: { $lte: batasWaktu }, status: 'OPEN' });
            if (sesiKedaluwarsa.length === 0) return;

            // ... Logika penutupan party mabar di sini ...

        } catch (error) {
            logger.error('Gagal menjalankan cron job mabarTimeout:', error);
        }
    }, { scheduled: true, timezone: "Asia/Jakarta" });
};