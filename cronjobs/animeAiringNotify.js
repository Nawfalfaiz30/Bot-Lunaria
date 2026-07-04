const cron = require('node-cron');
const animeTrackerHelper = require('../helpers/animeTracker');
const GuildSettings = require('../models/guildSchema');
const AnimeTracker = require('../models/animeTrackerSchema');
const { EmbedBuilder } = require('discord.js');
const logger = require('../helpers/logger');

module.exports = (client) => {
    // Mengecek jadwal ke memori lokal secara real-time setiap menit
    cron.schedule('* * * * *', async () => {
        try {
            const daftarServer = await GuildSettings.find({ animeChannel: { $ne: null } });
            if (daftarServer.length === 0) return;

            const scheduleList = await animeTrackerHelper.getRolling24HourSchedule();
            if (scheduleList.length === 0) return;

            const nowEpoch = Date.now();
            
            // Menggunakan Blok Menit untuk toleransi pencocokan tanpa meleset
            const currentMinuteBlock = Math.floor(nowEpoch / 60000);

            const rilisDetikIni = scheduleList.filter(anime => {
                const animeMinuteBlock = Math.floor(anime.timestamp / 60000);
                return animeMinuteBlock === currentMinuteBlock;
            });

            if (rilisDetikIni.length === 0) return;

            // Mengunci notifikasi dengan Format ID WIB (Anti Duplikat)
            const wibDate = new Date(nowEpoch + (7 * 60 * 60 * 1000));
            const currentReleaseKey = `${wibDate.getUTCFullYear()}-${wibDate.getUTCMonth() + 1}-${wibDate.getUTCDate()}`;

            for (const anime of rilisDetikIni) {
                const malId = anime.malId.toString();
                
                let trackRecord = await AnimeTracker.findOne({ animeId: malId });
                if (!trackRecord) {
                    trackRecord = new AnimeTracker({ animeId: malId, title: anime.title, lastEpisodeNotified: 0 });
                }

                if (trackRecord.lastReleaseKey === currentReleaseKey) continue;

                const embedAlert = new EmbedBuilder()
                    .setTitle('🚨 EPISODE TERBARU TELAH RILIS!!!')
                    .setDescription(
                        `### 🛰️ TRANSMISI SIARAN LANGSUNG\n` +
                        `📺 **${anime.title.toUpperCase()}**\n` +
                        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n` +
                        `├ 🕒 **Waktu Mengudara:** \`${anime.airingTime} WIB\`\n` +
                        `├ 🎬 **Format & Durasi:** \`${anime.type || 'TV'}\` • \`${anime.duration || 'N/A'}\`\n` +
                        `├ 📊 **Skor MAL:** ⭐ \`${anime.score}\`\n` +
                        `├ 🏢 **Studio:** \`${anime.studio}\` • \`${anime.source}\`\n` +
                        `└ 🎭 **Genre:** _${anime.genres}_\n` +
                        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`
                    )
                    .setImage(anime.imageUrl || null)
                    .setColor('#d90429') 
                    .setTimestamp()
                    .setFooter({ text: 'Lunaria Core • Live Broadcaster Engine', iconURL: client.user.displayAvatarURL() });

                for (const server of daftarServer) {
                    const channel = await client.channels.fetch(server.animeChannel).catch(() => null);
                    if (channel && channel.isTextBased()) {
                        await channel.send({ embeds: [embedAlert] });
                    }
                }

                trackRecord.lastReleaseKey = currentReleaseKey;
                trackRecord.lastEpisodeNotified += 1; 
                await trackRecord.save();
            }
        } catch (error) {
            logger.error('[CRON JOB] Gagal memproses alert rilis otomatis:', error);
        }
    }); // Zone waktu tidak diperlukan lagi karena hitungan berbasis epoch
};
