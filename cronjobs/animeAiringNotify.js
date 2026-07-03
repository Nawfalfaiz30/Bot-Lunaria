const cron = require('node-cron');
const axios = require('axios');
const GuildSettings = require('../models/guildSchema');
const AnimeTracker = require('../models/animeTrackerSchema');
const { EmbedBuilder } = require('discord.js');
const logger = require('../helpers/logger');

module.exports = (client) => {
    // Berjalan real-time memantau kecocokan menit rilis
    cron.schedule('* * * * *', async () => {
        try {
            const daftarServer = await GuildSettings.find({ animeChannel: { $ne: null } });
            if (daftarServer.length === 0) return;

            const wibSekarang = new Date();
            // Sinkronisasi Terbalik: Tambah 2 jam untuk menembak query kalender JST Jepang
            const jstSekarang = new Date(wibSekarang.getTime() + (2 * 60 * 60 * 1000));
            
            const jamJstStr = jstSekarang.getHours().toString().padStart(2, '0');
            const menitJstStr = jstSekarang.getMinutes().toString().padStart(2, '0');
            const targetWaktuJst = `${jamJstStr}:${menitJstStr}`;

            const daysEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const hariJstTarget = daysEng[jstSekarang.getDay()];

            const response = await axios.get(`https://api.jikan.moe/v4/schedules?filter=${hariJstTarget}`).catch(() => null);
            if (!response || !response.data.data) return;

            const rilisDetikIni = response.data.data.filter(anime => anime.broadcast?.time === targetWaktuJst);
            if (rilisDetikIni.length === 0) return;

            for (const anime of rilisDetikIni) {
                // Filter anti Boys Love / Girls Love
                const gabunganGenre = [...(anime.genres || []), ...(anime.explicit_genres || []), ...(anime.themes || [])];
                if (gabunganGenre.some(g => {
                    const name = g.name.toLowerCase();
                    return name.includes('boys love') || name.includes('girls love') || name.includes('shounen ai') || name.includes('shoujo ai');
                })) continue;

                const malId = anime.mal_id.toString();
                
                let trackRecord = await AnimeTracker.findOne({ animeId: malId });
                if (!trackRecord) {
                    trackRecord = new AnimeTracker({ animeId: malId, title: anime.title, lastEpisodeNotified: 0 });
                }

                // Ambil menit penayangan unik untuk mencegah spam di menit yang sama
                const currentReleaseKey = `${wibSekarang.getDate()}-${wibSekarang.getMonth()}`;
                if (trackRecord.lastReleaseKey === currentReleaseKey) continue;

                const jamWibAsli = wibSekarang.getHours().toString().padStart(2, '0');
                const menitWibAsli = wibSekarang.getMinutes().toString().padStart(2, '0');

                // Tampilan Alert Premium Kustom Lunaria - Tema Cyber Grid (Tanpa teks luar)
                const embedAlert = new EmbedBuilder()
                    .setTitle('🚨 EPISODE TERBARU TELAH RILIS!!!')
                    .setDescription(
                        `### 🛰️ TRANSMISI SIARAN LANGSUNG\n` +
                        `📺 **${anime.title.toUpperCase()}**\n` +
                        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n` +
                        `├ 🕒 **Waktu Mengudara:** \`${jamWibAsli}:${menitWibAsli} WIB\`\n` +
                        `├ 🎬 **Format & Durasi:** \`${anime.type || 'TV'}\` • \`${anime.duration || 'N/A'}\`\n` +
                        `├ 📊 **Skor MAL:** ⭐ \`${anime.score || 'N/A'}\`\n` +
                        `├ 🏢 **Studio:** \`${anime.studios?.map(s => s.name).join(', ') || 'N/A'}\` • \`${anime.source || 'N/A'}\`\n` +
                        `└ 🎭 **Genre:** _${anime.genres?.map(g => g.name).join(', ') || 'N/A'}_\n` +
                        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`
                    )
                    // Menggunakan gambar poster ukuran besar di bawah teks
                    .setImage(anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null)
                    .setColor('#d90429') 
                    .setTimestamp()
                    .setFooter({ text: 'Lunaria Core • Live Broadcaster Engine', iconURL: client.user.displayAvatarURL() });

                for (const server of daftarServer) {
                    const channel = await client.channels.fetch(server.animeChannel).catch(() => null);
                    if (channel && channel.isTextBased()) {
                        // --- PERBAIKAN: Mengirim HANYA embed tanpa tambahan pesan content di luarnya ---
                        await channel.send({ embeds: [embedAlert] });
                    }
                }

                // Simpan key tanggal rilis agar tidak terduplikasi dalam menit yang sama
                trackRecord.lastReleaseKey = currentReleaseKey;
                trackRecord.lastEpisodeNotified += 1; 
                await trackRecord.save();
            }
        } catch (error) {
            logger.error('[CRON JOB] Gagal memproses alert rilis otomatis:', error);
        }
    }, { scheduled: true, timezone: "Asia/Jakarta" });
};