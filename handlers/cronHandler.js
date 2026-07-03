const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

module.exports = (client) => {
    logger.info('⚙️  Memuat sistem otomatisasi (Cron Jobs)...');
    
    const cronPath = path.join(__dirname, '../cronjobs');
    if (!fs.existsSync(cronPath)) return logger.warn('⚠️  Folder cronjobs tidak ditemukan.');

    const cronFiles = fs.readdirSync(cronPath).filter(file => file.endsWith('.js'));

    for (const file of cronFiles) {
        try {
            const cronJob = require(path.join(cronPath, file));
            // Jalankan fungsi cron dengan mengoper client discord
            cronJob(client);
            logger.info(`✅ Cron Job Berhasil Dimuat: ${file}`);
        } catch (error) {
            logger.error(`❌ Gagal memuat Cron Job [${file}]:`, error);
        }
    }
};