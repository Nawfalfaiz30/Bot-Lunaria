const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

module.exports = (client) => {
    let eventCount = 0;
    
    const eventsPath = path.join(__dirname, '../events');
    if (!fs.existsSync(eventsPath)) {
        logger.warn("Folder 'events' belum dibuat. Mengabaikan pemuatan Event.");
        return;
    }

    const readEvents = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            // Baca sub-folder secara rekursif (misal: events/discord dan events/distube)
            if (stat.isDirectory()) {
                readEvents(filePath);
            } else if (file.endsWith('.js')) {
                const event = require(filePath);
                
                if (event.name && event.execute) {
                    // Deteksi apakah ini event untuk DisTube (Sistem Musik)
                    if (event.isDistube) {
                        client.distube.on(event.name, (...args) => event.execute(...args, client));
                    } 
                    // Jika event bawaan Discord (sekali jalan / once)
                    else if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } 
                    // Jika event bawaan Discord (berulang / on)
                    else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                    eventCount++;
                }
            }
        }
    };

    readEvents(eventsPath);
    logger.success(`Berhasil memuat ${eventCount} Events (Discord & DisTube).`);
};