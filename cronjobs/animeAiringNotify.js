const cron = require('node-cron');
const animeTrackerHelper = require('../helpers/animeTracker');
const GuildSettings = require('../models/guildSchema');
const AnimeTracker = require('../models/animeTrackerSchema');
const { EmbedBuilder } = require('discord.js');
const logger = require('../helpers/logger');

const lockNotifiedList = new Set();

module.exports = (client) => {
    cron.schedule('* * * * *', async () => {
        try {
            const daftarServer = await GuildSettings.find({ animeChannel: { $ne: null } });
            if (daftarServer.length === 0) return;

            const rawAnimeList = await animeTrackerHelper.getRawAnimeDatabase();
            if (!rawAnimeList || rawAnimeList.length === 0) return;

            // =========================================================
            // KALKULASI WAKTU MUTLAK (KEBAL DARI ZONA WAKTU VPS)
            // Metode ini dipastikan 100% sinkron dengan Daily Tracker
            // =========================================================
            const nowEpoch = Date.now();
            const jstOffset = 9 * 60 * 60 * 1000; // GMT+9
            const wibOffset = 7 * 60 * 60 * 1000; // GMT+7

            // Buat objek Date berbasis pergeseran waktu lalu panggil memakai fungsi UTC
            const jstDate = new Date(nowEpoch + jstOffset);
            const wibDate = new Date(nowEpoch + wibOffset);

            const daysEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const hariJstTarget = daysEng[jstDate.getUTCDay()];
            
            // Format waktu menjadi 09:05, 14:30, dll berdasarkan waktu Jepang
            const targetWaktuJst = `${jstDate.getUTCHours().toString().padStart(2, '0')}:${jstDate.getUTCMinutes().toString().padStart(2, '0')}`;
            
            // Kunci tracker berbasis WIB
            const tanggalWibKunci = `${wibDate.getUTCFullYear()}-${(wibDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${wibDate.getUTCDate().toString().padStart(2, '0')}`;

            const rilisMenitIni = rawAnimeList.filter(anime => {
                if (!anime.broadcast?.day || !anime.broadcast?.time) return false;
                const dayMatch = anime.broadcast.day.toLowerCase().includes(hariJstTarget);
                const timeMatch = anime.broadcast.time === targetWaktuJst;
                return dayMatch && timeMatch;
            });

            if (rilisMenitIni.length === 0) return;

            for (const anime of rilisMenitIni) {
                // Proteksi anti anime rilis bulan depan
                if (anime.aired?.from) {
                    const premiereUnix = new Date(anime.aired.from).getTime();
                    if (nowEpoch < (premiereUnix - (24 * 60 * 60 * 1000))) continue;
                }

                // Proteksi filter genre eksplisit (Sinkron dengan versi Daily)
                const gabunganGenre = [...(anime.genres || []), ...(anime.explicit_genres || []), ...(anime.themes || [])];
                if (gabunganGenre.some(g => {
                    const name = g.name?.toLowerCase() || ''; // Tambahan optional chaining (?.), proteksi jika ada anime yg field genrenya rusak/null dari API
                    return name.includes('boys love') || name.includes('girls love') || name.includes('shounen ai') || name.includes('shoujo ai') || name.includes('hentai') || name.includes('erotica');
                })) continue;

                const malId = anime.mal_id.toString();
                const uniqueLockKey = `${malId}-${tanggalWibKunci}`;

                // Anti Spam Alert
                if (lockNotifiedList.has(uniqueLockKey)) continue;
                lockNotifiedList.add(uniqueLockKey); 

                let trackRecord = await AnimeTracker.findOne({ animeId: malId });
                if (!trackRecord) {
                    trackRecord = new AnimeTracker({ animeId: malId, title: anime.title, lastEpisodeNotified: 0 });
                }

                if (trackRecord.lastReleaseKey === uniqueLockKey) continue;

                const [bHourStr, bMinuteStr] = anime.broadcast.time.split(':');
                let wibShowHour = parseInt(bHourStr, 10) - 2;
                if (wibShowHour < 0) wibShowHour += 24;
                const jamTampilWibDinamis = `${wibShowHour.toString().padStart(2, '0')}:${bMinuteStr} WIB`;

                const embedAlert = new EmbedBuilder()
                    .setTitle('🚨 EPISODE TERBARU TELAH RILIS!!!')
                    .setDescription(
                        `### 🛰️ TRANSMISI SIARAN LANGSUNG\n` +
                        `📺 **${anime.title.toUpperCase()}**\n` +
                        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n` +
                        `├ 🕒 **Waktu Mengudara:** \`${jamTampilWibDinamis}\`\n` +
                        `├ 🎬 **Format & Durasi:** \`${anime.type || 'TV'}\` • \`${anime.duration || 'N/A'}\`\n` +
                        `├ 📊 **Skor MAL:** ⭐ \`${anime.score || 'N/A'}\`\n` +
                        `├ 🏢 **Studio:** \`${anime.studios?.map(s => s.name).join(', ') || 'N/A'}\` • \`${anime.source || 'N/A'}\`\n` +
                        `└ 🎭 **Genre:** _${anime.genres?.map(g => g.name).join(', ') || 'N/A'}_\n` +
                        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`
                    )
                    .setColor('#d90429') 
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Lunaria Core • Live Broadcaster Engine', 
                        iconURL: client.user?.displayAvatarURL() || null 
                    });

                // Set Gambar secara dinamis, mencegah error jika field Jikan API mengembalikan "null"
                const imageUrl = anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
                if (imageUrl) {
                    embedAlert.setImage(imageUrl);
                }

                for (const server of daftarServer) {
                    const channel = await client.channels.fetch(server.animeChannel).catch(() => null);
                    if (channel && channel.isTextBased()) {
                        // Tambahan catch di .send() agar bot tidak putus looping jika ada server yang mencabut permission
                        await channel.send({ embeds: [embedAlert] }).catch(err => {
                            logger.warn(`[BROADCAST WARN] Gagal mengirim alert live ke guild ${server.guildId}: ${err.message}`);
                        });
                    }
                }

                trackRecord.lastReleaseKey = uniqueLockKey;
                trackRecord.lastEpisodeNotified += 1; 
                await trackRecord.save();
            }

            // Bersihkan antrian memori cache
            if (lockNotifiedList.size > 200) lockNotifiedList.clear();

        } catch (error) {
            logger.error('[CRON JOB] Gagal memproses alert rilis otomatis:', error);
        }
    }, { scheduled: true }); // Tidak perlu parameter timezone di node-cron untuk notifikasi menitan ini, karena kita sudah menggunakan waktu Mutlak Date.now().
};
