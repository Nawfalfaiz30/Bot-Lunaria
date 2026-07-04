const axios = require('axios');
const logger = require('./logger');

let cachedAnimeData = [];
let lastFetchTime = 0;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // Cache 2 Jam

// Fetch dengan proteksi Rate Limit
const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.get(url, { headers: { 'Accept': 'application/json' } });
            return res.data;
        } catch (error) {
            if (i === retries - 1) return null;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
};

// Mengambil seluruh halaman tanpa ampun
const fetchAllPages = async (baseUrl) => {
    let allData = [];
    let page = 1;
    while (true) {
        const data = await fetchWithRetry(`${baseUrl}&page=${page}`);
        if (!data || !data.data || data.data.length === 0) break;
        
        allData = allData.concat(data.data);
        if (!data.pagination?.has_next_page) break;
        
        page++;
        await new Promise(r => setTimeout(r, 1200)); // Delay 1.2 detik per halaman agar 100% aman dari Banned API
    }
    return allData;
};

// Mengambil Seluruh Anime Tayang (Baru + Lanjutan) & Anime Mendatang
const getMassiveAnimeList = async () => {
    logger.info('[ANIME TRACKER] Menarik data besar-besaran (All Airing + Upcoming)...');
    
    // Harus berurutan (await satu per satu) agar tidak memicu Rate Limit MAL
    const airingData = await fetchAllPages('https://api.jikan.moe/v4/anime?status=airing&type=tv');
    const upcomingData = await fetchAllPages('https://api.jikan.moe/v4/seasons/upcoming?filter=tv');

    const combined = [...airingData, ...upcomingData];
    
    // Hapus duplikat berdasarkan MAL ID (jika ada anime yang tumpang tindih)
    const uniqueAnime = combined.reduce((acc, current) => {
        if (!acc.find(item => item.mal_id === current.mal_id)) {
            acc.push(current);
        }
        return acc;
    }, []);

    return uniqueAnime;
};

module.exports = {
    getRolling24HourSchedule: async () => {
        try {
            const nowEpoch = Date.now();
            const endEpoch = nowEpoch + (24 * 60 * 60 * 1000);
            const jstOffset = 9 * 60 * 60 * 1000;
            const wibOffset = 7 * 60 * 60 * 1000;

            if (cachedAnimeData.length === 0 || nowEpoch - lastFetchTime > CACHE_DURATION) {
                const newData = await getMassiveAnimeList();
                if (newData.length > 0) {
                    cachedAnimeData = newData;
                    lastFetchTime = nowEpoch;
                }
            }

            const kumpulanAnimeTerfilter = [];
            const jstDateNow = new Date(nowEpoch + jstOffset);
            
            const currentJstDay = jstDateNow.getUTCDay();
            const currentJstHour = jstDateNow.getUTCHours();
            const currentJstMinute = jstDateNow.getUTCMinutes();

            const daysMap = {
                'sundays': 0, 'sunday': 0, 'mondays': 1, 'monday': 1, 'tuesdays': 2, 'tuesday': 2,
                'wednesdays': 3, 'wednesday': 3, 'thursdays': 4, 'thursday': 4, 'fridays': 5, 'friday': 5,
                'saturdays': 6, 'saturday': 6
            };

            for (const anime of cachedAnimeData) {
                // Saringan Konten (Blokir Genre Eksplisit)
                const gabunganGenre = [...(anime.genres || []), ...(anime.explicit_genres || []), ...(anime.themes || [])].map(g => g.name.toLowerCase());
                if (gabunganGenre.some(g => g.includes('boys love') || g.includes('girls love') || g.includes('shounen ai') || g.includes('shoujo ai') || g.includes('hentai') || g.includes('erotica'))) continue;

                if (!anime.broadcast?.day || !anime.broadcast?.time) continue;

                const targetDayStr = anime.broadcast.day.toLowerCase();
                const targetDayNum = daysMap[targetDayStr];
                if (targetDayNum === undefined) continue;

                const [hourStr, minuteStr] = anime.broadcast.time.split(':');
                const hourJst = parseInt(hourStr, 10);
                const minuteJst = parseInt(minuteStr, 10);

                // MATEMATIKA ZONA WAKTU MUTLAK
                let dayDiff = targetDayNum - currentJstDay;
                
                // Cari penayangan terdekat (jika sudah lewat hari ini, lempar ke minggu depan)
                if (dayDiff < 0 || (dayDiff === 0 && (currentJstHour > hourJst || (currentJstHour === hourJst && currentJstMinute >= minuteJst)))) {
                    dayDiff += 7;
                }

                // Kalkulasi Epoch waktu Jepang dan tarik ke UTC Universal
                const targetJstDate = new Date(Date.UTC(jstDateNow.getUTCFullYear(), jstDateNow.getUTCMonth(), jstDateNow.getUTCDate() + dayDiff, hourJst, minuteJst, 0));
                const airingUnix = targetJstDate.getTime() - jstOffset;

                // PROTEKSI 1: Pastikan belum Tamat
                if (anime.aired?.to) {
                    const tamatUnix = new Date(anime.aired.to).getTime();
                    // Beri toleransi 3 hari pasca-tamat agar episode terakhir tetap ter-notify
                    if (nowEpoch > tamatUnix + (3 * 24 * 60 * 60 * 1000)) continue; 
                }

                // PROTEKSI 2: Pastikan sudah Premiere (Mulai Tayang)
                if (anime.aired?.from) {
                    const premiereUnix = new Date(anime.aired.from).getTime();
                    // Jika kalkulasi jam tayang minggu ini ternyata lebih dulu daripada tanggal premiere resmi, skip.
                    if (airingUnix < (premiereUnix - (24 * 60 * 60 * 1000))) continue; 
                }

                // Cek apakah masuk dalam Jendela 24 Jam ke depan
                if (airingUnix >= nowEpoch && airingUnix <= endEpoch) {
                    const selisihMilidetik = airingUnix - nowEpoch;
                    
                    let teksCountdown = '`🟢 Sedang Tayang`';
                    if (selisihMilidetik > 60000) { // Lebih dari 1 Menit
                        const sisaJam = Math.floor(selisihMilidetik / (1000 * 60 * 60));
                        const sisaMenit = Math.floor((selisihMilidetik % (1000 * 60 * 60)) / (1000 * 60));
                        teksCountdown = `\`⏳ dalam ${sisaJam} jam ${sisaMenit} menit\``;
                    }

                    // Tampilan Format WIB
                    const wibDate = new Date(airingUnix + wibOffset);
                    const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][wibDate.getUTCDay()];
                    const blnIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][wibDate.getUTCMonth()];
                    
                    const jamWib = `${wibDate.getUTCHours().toString().padStart(2, '0')}:${wibDate.getUTCMinutes().toString().padStart(2, '0')}`;
                    const tanggalWib = `${hariIndo}, ${wibDate.getUTCDate().toString().padStart(2, '0')} ${blnIndo} ${wibDate.getUTCFullYear()}`;

                    kumpulanAnimeTerfilter.push({
                        malId: anime.mal_id,
                        title: anime.title,
                        type: anime.type,
                        duration: anime.duration,
                        imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
                        airingTime: jamWib,
                        airingDate: tanggalWib,
                        countdown: teksCountdown,
                        score: anime.score || 'N/A',
                        source: anime.source || 'Unknown',
                        studio: anime.studios?.map(s => s.name).join(', ') || 'Unknown',
                        genres: anime.genres?.map(g => g.name).join(', ') || 'N/A',
                        timestamp: airingUnix
                    });
                }
            }

            return kumpulanAnimeTerfilter.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            logger.error('[ANIME TRACKER] Terjadi kesalahan kritis:', error);
            return [];
        }
    }
}; 
