const cron = require('node-cron');
const animeTrackerHelper = require('../helpers/animeTracker');
const GuildSettings = require('../models/guildSchema');
const { EmbedBuilder } = require('discord.js');
const logger = require('../helpers/logger');

module.exports = (client) => {
    // Eksekusi jam 22:55 WIB mutlak
    cron.schedule('0 6 * * *', async () => {
        logger.info('[CRON JOB] Memancarkan pembaruan visual koran anime...');
        try {
            const guilds = await GuildSettings.find({ animeChannel: { $ne: null } });
            if (guilds.length === 0) return;

            const scheduleList = await animeTrackerHelper.getRolling24HourSchedule();
            if (scheduleList.length === 0) {
                logger.info('[CRON JOB] Tidak ada jadwal penayangan anime aktif dalam 24 jam ke depan.');
                return;
            }

            const sekarang = new Date();

            const embedDashboard = new EmbedBuilder()
                .setTitle('⚡ LUNARIA ANIME DAILY')
                .setDescription(
                    `### 🛰️ TRANSMISI PENAYANGAN AKTIF\n` +
                    `> *Jadwal penayangan anime untuk 24 jam ke depan.*\n` +
                    `*Waktu Broadcast: <t:${Math.floor(sekarang.getTime() / 1000)}:F>*\n`
                )
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor('#00ffcc') 
                .setTimestamp()
                .setFooter({ text: 'Lunaria Core • Automated Tracking System', iconURL: client.user.displayAvatarURL() });

            let fieldTeks = "";
            let chunkId = 1;

            scheduleList.forEach((anime) => {
                const itemBlock = 
                    `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n` +
                    `📺 **${anime.title.toUpperCase()}**\n` +
                    `├ 🕒 **Waktu:** \`${anime.airingTime} WIB\` (${anime.airingDate.split(',')[0]})\n` +
                    `├ 📣 **Status:** ${anime.countdown}\n` +
                    `├ 📊 **Info:** ⭐ \`${anime.score}\` • 🏢 \`${anime.studio}\`\n` +
                    `└ 🎭 **Genre:** _${anime.genres}_\n\n`;

                // Pecah belah ke field baru jika kepanjangan (Batas aman 950 huruf per field discord)
                if ((fieldTeks + itemBlock).length > 950) {
                    embedDashboard.addFields({ 
                        name: chunkId === 1 ? '\n📅 LIST ANIME YANG TAYANG' : '\u200B', 
                        value: fieldTeks 
                    });
                    fieldTeks = itemBlock;
                    chunkId++;
                } else {
                    fieldTeks += itemBlock;
                }
            });

            // Sisa text terakhir yang belum dimasukkan
            if (fieldTeks) {
                embedDashboard.addFields({ 
                    name: chunkId === 1 ? '\n📅 LIST ANIME YANG TAYANG' : '\u200B', 
                    value: fieldTeks 
                });
            }

            for (const server of guilds) {
                const channel = await client.channels.fetch(server.animeChannel).catch(() => null);
                if (channel && channel.isTextBased()) {
                    await channel.send({ embeds: [embedDashboard] });
                }
            }
            logger.info('[CRON JOB] Sukses mendistribusikan visual koran tunggal.');
        } catch (error) {
            logger.error('[CRON JOB] Terjadi error pada eksekusi animeDailySchedule:', error);
        }
    }, { scheduled: true, timezone: "Asia/Jakarta" });
};
