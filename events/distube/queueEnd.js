const playdl = require('play-dl');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'queueEnd',
    async execute(queue) {
        // Cek apakah user menyalakan Custom Autoplay Engine milik kita
        if (queue.customAutoplay && queue.lastPlayedSong) {
            try {
                const lastSong = queue.lastPlayedSong;
                logger.info(`[AUTOPLAY ENGINE] Menghitung rekomendasi musik sejenis untuk: "${lastSong.name}"`);

                let nextSongUrl = null;

                // ─── STRATEGI 1: MENGINTIP YOUTUBE RELATED VIDEOS (95% Akurat Sesuai Genre Asli) ───
                try {
                    const videoInfo = await playdl.video_info(lastSong.url);
                    if (videoInfo.related_videos && videoInfo.related_videos.length > 0) {
                        // Ambil 5 teratas dari video terkait milik algoritma YouTube
                        const pool = videoInfo.related_videos.slice(0, 5);
                        // Pilih 1 video secara acak dari pool agar lagu tidak monoton
                        const chosenId = pool[Math.floor(Math.random() * pool.length)];
                        if (chosenId) {
                            nextSongUrl = `https://www.youtube.com/watch?v=${chosenId}`;
                        }
                    }
                } catch (scrapeErr) {
                    logger.warn('[AUTOPLAY ENGINE] Gagal memuat Related Videos, beralih ke Strategi 2 (Keyword Smart Match).');
                }

                // ─── STRATEGI 2: FALLBACK KEYWORD SMART MATCH (Jika sidebar YouTube terkunci) ───
                if (!nextSongUrl) {
                    // Bersihkan nama lagu dari simbol kurung, album, atau teks sampah
                    const cleanKeyword = lastSong.name
                        .split(/[-|(|\[]/)[0]
                        .replace(/official/gi, '')
                        .replace(/video/gi, '')
                        .trim();

                    // Cari lagu sejenis dengan embel-embel "mix" agar tipenya selaras
                    const searchResults = await playdl.search(`${cleanKeyword} related mix`, { limit: 5, source: { youtube: 'video' } });
                    
                    if (searchResults && searchResults.length > 0) {
                        // Singkirkan lagu yang baru saja diputar agar tidak terjadi looping lagu yang sama
                        const filteredPool = searchResults.filter(video => video.url !== lastSong.url);
                        const finalPool = filteredPool.length > 0 ? filteredPool : searchResults;
                        
                        const chosenVideo = finalPool[Math.floor(Math.random() * Math.min(finalPool.length, 3))];
                        nextSongUrl = chosenVideo.url;
                    }
                }

                // ─── EKSEKUSI PEMUTARAN LAGU OTOMATIS ───
                if (nextSongUrl) {
                    if (queue.textChannel) {
                        queue.textChannel.send('✨ **[Autoplay]** Antrean habis, memutarkan lagu sejenis berikutnya untukmu...');
                    }

                    // Putar lagu baru hasil rekomendasi pintar
                    return await queue.distube.play(queue.voiceChannel, nextSongUrl, {
                        textChannel: queue.textChannel,
                        member: queue.voiceChannel.guild.members.me
                    });
                }

            } catch (error) {
                logger.error('[AUTOPLAY ENGINE CRITICAL ERROR]', error);
            }
        }

        // Jika Autoplay bernilai FALSE atau gagal menemukan lagu, kirim pesan selesai normal
        if (queue.textChannel) {
            queue.textChannel.send('🎵 Antrean lagu telah selesai diputar!');
        }
    }
};