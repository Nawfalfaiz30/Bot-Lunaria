const logger = require('../../helpers/logger');
const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        logger.success(`🟢 Bot berhasil online! Terhubung sebagai: ${client.user.tag}`);
        
        // Mengatur status bot di profilnya
        client.user.setPresence({
            activities: [
                { 
                    name: 'RPG System | ln!help', 
                    type: ActivityType.Playing 
                }
            ],
            status: 'online', // Bisa diganti 'idle' atau 'dnd'
        });

        // Menampilkan total server yang mengundang bot ini
        logger.info(`Lunaria sedang melayani ${client.guilds.cache.size} server.`);
    },
};
const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady, // Atau gunakan string 'clientReady'
    once: true,
    execute(client) {
        console.log(`${client.user.tag} siap beraksi!`);
    },
};