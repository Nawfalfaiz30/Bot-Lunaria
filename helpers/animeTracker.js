const axios = require('axios');
const logger = require('./logger');

module.exports = {
    /**
     * Memetakan jadwal anime dalam jendela 24 jam bergulir murni sejak runtime saat ini.
     */
    getRolling24HourSchedule: async () => {
        try {
            const daysEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const tglIndoNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const hariIndoNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            
            const sekarangWib = new Date();
            // PERBAIKAN: Batas awal adalah JAM SEKARANG (Real-time saat cron jalan)
            const startWib = sekarangWib.getTime();
            // PERBAIKAN: Batas akhir adalah BENAR-BENAR 24 jam ke depan dari sekarang
            const endWib = startWib + (24 * 60 * 60 * 1000);

            const indeksHariIni = sekarangWib.getDay();
            const indeksBesok = (indeksHariIni + 1) % 7;

            // Ambil data dari API untuk hari ini dan besok
            const resHariIni = await axios.get(`https://api.jikan.moe/v4/schedules?filter=${daysEng[indeksHariIni]}`).catch(() => ({ data: { data: [] } }));
            const resHariBesok = await axios.get(`https://api.jikan.moe/v4/schedules?filter=${daysEng[indeksBesok]}`).catch(() => ({ data: { data: [] } }));

            const kumpulanAnimeTerfilter = [];

            const prosesSaringanJadwal = (daftarAnime, beralihKeHariEsok) => {
                if (!daftarAnime || !Array.isArray(daftarAnime)) return;

                for (const anime of daftarAnime) {
                    // 1. FILTERING: Blokir konten Boys Love & Girls Love (Theme & Explicit)
                    const gabunganGenre = [...(anime.genres || []), ...(anime.explicit_genres || []), ...(anime.themes || [])];
                    if (gabunganGenre.some(g => {
                        const name = g.name.toLowerCase();
                        return name.includes('boys love') || name.includes('girls love') || name.includes('shounen ai') || name.includes('shoujo ai');
                    })) continue;

                    // 2. NATIVE TIME & DATE SHIFTING (JST -> WIB)
                    const stringWaktuJst = anime.broadcast?.time || '00:00';
                    const [jamJst, menitJst] = stringWaktuJst.split(':').map(Number);

                    // Buat jangkar waktu JST berdasarkan kalender eksekusi saat ini
                    const jstBroadcastDate = new Date(sekarangWib.getTime());
                    if (beralihKeHariEsok) {
                        jstBroadcastDate.setDate(jstBroadcastDate.getDate() + 1);
                    }
                    jstBroadcastDate.setHours(jamJst, menitJst, 0, 0);

                    // Konversi ke objek waktu Indonesia (WIB) dengan mengurangi 2 jam dari JST
                    const objekWaktuAiringWib = new Date(jstBroadcastDate.getTime() - (2 * 60 * 60 * 1000));
                    const timestampAiringWib = objekWaktuAiringWib.getTime();

                    // 3. SELECTION: Validasi dinamis 24 jam ke depan
                    if (timestampAiringWib >= startWib && timestampAiringWib < endWib) {
                        const selisihMilidetik = timestampAiringWib - sekarangWib.getTime();
                        
                        // Hitung mundur dinamis real-time
                        let teksCountdown = 'Selesai Tayang';
                        if (selisihMilidetik > 0) {
                            const sisaJam = Math.floor(selisihMilidetik / (1000 * 60 * 60));
                            const sisaMenit = Math.floor((selisihMilidetik % (1000 * 60 * 60)) / (1000 * 60));
                            teksCountdown = `\`⏳ dalam ${sisaJam} jam ${sisaMenit} menit\``;
                        } else if (Math.abs(selisihMilidetik) < 5 * 60 * 1000) {
                            teksCountdown = '`🟢 Sedang Tayang`';
                        }

                        // Ekstrak data penanggalan WIB
                        const namaHariWib = hariIndoNames[objekWaktuAiringWib.getDay()];
                        const tglWib = objekWaktuAiringWib.getDate().toString().padStart(2, '0');
                        const blnWib = tglIndoNames[objekWaktuAiringWib.getMonth()];
                        const thnWib = objekWaktuAiringWib.getFullYear();
                        const tanggalWibFinal = `${namaHariWib}, ${tglWib} ${blnWib} ${thnWib}`;

                        const jamTampilanWib = `${objekWaktuAiringWib.getHours().toString().padStart(2, '0')}:${objekWaktuAiringWib.getMinutes().toString().padStart(2, '0')}`;

                        kumpulanAnimeTerfilter.push({
                            title: anime.title,
                            airingTime: jamTampilanWib,
                            airingDate: tanggalWibFinal,
                            countdown: teksCountdown,
                            score: anime.score || 'N/A',
                            source: anime.source || 'Manga',
                            studio: anime.studios?.map(s => s.name).join(', ') || 'N/A',
                            genres: anime.genres?.map(g => g.name).join(', ') || 'N/A',
                            timestamp: timestampAiringWib
                        });
                    }
                }
            };

            prosesSaringanJadwal(resHariIni.data.data, false);
            prosesSaringanJadwal(resHariBesok.data.data, true);

            // Urutkan jadwal kronologis dari yang paling dekat waktu rilisnya
            return kumpulanAnimeTerfilter.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            logger.error('[ANIME TRACKER] Gagal memproses data kalender waktu:', error);
            return [];
        }
    }
};