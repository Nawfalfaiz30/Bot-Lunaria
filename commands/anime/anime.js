const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'anime',
    aliases: ['animesearch', 'carianime', 'animenews', 'animeupdates', 'infonime', 'listanime', 'nimesearch', 'character', 'char', 'charasearch', 'manga', 'carimanga', 'komik', 'quote', 'animequote', 'katamutiara', 'recommend', 'animerandom', 'rekomendasi'],
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Sistem pencarian informasi, berita, manga, dan referensi seputar anime.')
        
        // Subcommand: Info (Detail Anime)
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Mencari data detail informasi suatu Anime.')
                .addStringOption(opt => opt.setName('judul').setDescription('Judul anime yang dicari').setRequired(true))
        )
        // Subcommand: News (Trending Musim Ini)
        .addSubcommand(sub => sub.setName('news').setDescription('Melihat daftar anime terpopuler yang sedang tayang musim ini.'))
        
        // Subcommand: Search (Daftar Alternatif)
        .addSubcommand(sub =>
            sub.setName('search')
                .setDescription('Mencari daftar alternatif judul anime berdasarkan kata kunci.')
                .addStringOption(opt => opt.setName('keyword').setDescription('Kata kunci pencarian').setRequired(true))
        )
        // Subcommand: Character (Profil Karakter)
        .addSubcommand(sub =>
            sub.setName('character')
                .setDescription('Mencari data profil karakter anime.')
                .addStringOption(opt => opt.setName('nama').setDescription('Nama karakter').setRequired(true))
        )
        // Subcommand: Manga (Detail Komik)
        .addSubcommand(sub =>
            sub.setName('manga')
                .setDescription('Mencari data detail informasi suatu Manga.')
                .addStringOption(opt => opt.setName('judul').setDescription('Judul manga yang dicari').setRequired(true))
        )
        // Subcommand: Quote (Kata Mutiara)
        .addSubcommand(sub => sub.setName('quote').setDescription('Mendapatkan kutipan kata bijak dari karakter anime.'))
        
        // Subcommand: Recommend (Acak Pilihan DB)
        .addSubcommand(sub => sub.setName('recommend').setDescription('Mendapatkan satu rekomendasi anime acak pilihan database.')),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const author = isInteraction ? context.user : context.author;

        // --- PARSING INTEGRASI SUBCOMMAND & TEKS QUERY (SISTEM BARU) ---
        let subcommand = '';
        let textQuery = '';

        if (isInteraction) {
            subcommand = context.options.getSubcommand(false);
            if (!subcommand) {
                return context.reply({ 
                    content: '⚠️ Silakan pilih salah satu sub-command yang tersedia!', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
            if (subcommand === 'info' || subcommand === 'manga') textQuery = context.options.getString('judul');
            else if (subcommand === 'search') textQuery = context.options.getString('keyword');
            else if (subcommand === 'character') textQuery = context.options.getString('nama');
        } else {
            // Logika baru untuk Prefix Command: Membaca argumen pertama secara presisi
            const firstArg = args[0]?.toLowerCase();
            const validSubcommands = ['info', 'news', 'search', 'character', 'manga', 'quote', 'recommend'];

            if (validSubcommands.includes(firstArg)) {
                subcommand = firstArg;
                args.shift(); // Buang nama subcommand agar tidak ikut masuk ke textQuery pencarian API
                textQuery = args.join(' ');
            } else {
                // Deteksi otomatis berdasarkan alias yang digunakan saat memanggil perintah
                const fullContent = context.content.toLowerCase();
                if (fullContent.includes('animesearch') || fullContent.includes('listanime') || fullContent.includes('nimesearch')) subcommand = 'search';
                else if (fullContent.includes('animenews') || fullContent.includes('animeupdates')) subcommand = 'news';
                else if (fullContent.includes('character') || fullContent.includes('char') || fullContent.includes('charasearch')) subcommand = 'character';
                else if (fullContent.includes('manga') || fullContent.includes('carimanga') || fullContent.includes('komik')) subcommand = 'manga';
                else if (fullContent.includes('quote') || fullContent.includes('animequote') || fullContent.includes('katamutiara')) subcommand = 'quote';
                else if (fullContent.includes('recommend') || fullContent.includes('animerandom') || fullContent.includes('rekomendasi')) subcommand = 'recommend';
                else subcommand = 'info'; // Default fallback teraman
                
                textQuery = args.join(' ');
            }
        }

        // --- VALIDASI AKHIR INPUT ---
        if (['info', 'search', 'character', 'manga'].includes(subcommand) && !textQuery) {
            const missingText = {
                info: 'Harap berikan judul anime yang ingin dicari!',
                search: 'Harap tentukan kata kunci pencarian anime!',
                character: 'Masukkan nama karakter yang ingin dicari!',
                manga: 'Masukkan judul manga yang dicari!'
            };
            return context.reply({ content: missingText[subcommand], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
        }

        if (context.deferReply) await context.deferReply();

        try {
            // --- CASE 1: INFO (ANIME DETAIL VIEW) ---
            if (subcommand === 'info') {
                const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(textQuery)}&limit=1`);
                const resData = await response.json();

                if (!resData.data || resData.data.length === 0) {
                    const noResult = { content: `Anime dengan judul **${textQuery}** tidak ditemukan.` };
                    return isInteraction ? context.editReply(noResult) : context.reply(noResult);
                }

                const anime = resData.data[0];
                const infoEmbed = new EmbedBuilder()
                    .setTitle(anime.title)
                    .setURL(anime.url)
                    .setColor('#2e51a2')
                    .setThumbnail(anime.images.jpg.image_url)
                    .setDescription(anime.synopsis ? anime.synopsis.substring(0, 800) + '...' : 'Tidak ada sinopsis.')
                    .addFields(
                        { name: '📺 Tipe', value: `${anime.type || 'N/A'} (${anime.episodes || '?'} eps)`, inline: true },
                        { name: '⭐ Skor', value: `${anime.score || 'N/A'}`, inline: true },
                        { name: '📅 Status', value: `${anime.status || 'N/A'}`, inline: true },
                        { name: '🏷️ Genres', value: anime.genres.map(g => g.name).join(', ') || 'N/A' }
                    )
                    .setFooter({ text: `Dicari oleh ${author.username}` });

                return isInteraction ? await context.editReply({ embeds: [infoEmbed] }) : await context.reply({ embeds: [infoEmbed] });
            }

            // --- CASE 2: NEWS (SEASONAL CURRENTLY AIRING) ---
            if (subcommand === 'news') {
                const response = await fetch('https://api.jikan.moe/v4/seasons/now?limit=5');
                const resData = await response.json();

                if (!resData.data || resData.data.length === 0) {
                    const noData = { content: 'Gagal memuat jadwal rilis musim ini.' };
                    return isInteraction ? context.editReply(noData) : context.reply(noData);
                }

                const newsEmbed = new EmbedBuilder()
                    .setTitle('📺 Top Trending Anime Tayang Musim Ini')
                    .setColor('#34495e')
                    .setTimestamp();

                resData.data.forEach((anime, index) => {
                    newsEmbed.addFields({
                        name: `${index + 1}. ${anime.title}`,
                        value: `⭐ Skor: \`${anime.score || 'N/A'}\` | Tipe: \`${anime.type || 'N/A'}\`\nStudio: ${anime.studios.map(s => s.name).join(', ') || 'N/A'}`
                    });
                });

                return isInteraction ? await context.editReply({ embeds: [newsEmbed] }) : await context.reply({ embeds: [newsEmbed] });
            }

            // --- CASE 3: SEARCH (LIST MATCHES VIEW) ---
            if (subcommand === 'search') {
                const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(textQuery)}&limit=5`);
                const resData = await response.json();

                if (!resData.data || resData.data.length === 0) {
                    const noRes = { content: 'Hasil pencarian nihil.' };
                    return isInteraction ? context.editReply(noRes) : context.reply(noRes);
                }

                const searchEmbed = new EmbedBuilder()
                    .setTitle(`🔍 Hasil Pencarian untuk: "${textQuery}"`)
                    .setColor('#2980b9')
                    .setDescription('Berikut adalah beberapa judul anime yang cocok dengan pencarianmu:')
                    .setTimestamp();

                resData.data.forEach((anime, idx) => {
                    searchEmbed.addFields({
                        name: `${idx + 1}. ${anime.title}`,
                        value: `Tipe: \`${anime.type || 'N/A'}\` | Skor: \`${anime.score || 'N/A'}\` | [Link MAL](${anime.url})`
                    });
                });

                return isInteraction ? await context.editReply({ embeds: [searchEmbed] }) : await context.reply({ embeds: [searchEmbed] });
            }

            // --- CASE 4: CHARACTER ---
            if (subcommand === 'character') {
                const response = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(textQuery)}&limit=1`);
                const resData = await response.json();

                if (!resData.data || resData.data.length === 0) {
                    const noChar = { content: 'Karakter tidak ditemukan.' };
                    return isInteraction ? context.editReply(noChar) : context.reply(noChar);
                }

                const char = resData.data[0];
                const charEmbed = new EmbedBuilder()
                    .setTitle(char.name)
                    .setURL(char.url)
                    .setColor('#e74c3c')
                    .setThumbnail(char.images.jpg.image_url)
                    .setDescription(char.about ? char.about.substring(0, 1000) + '...' : 'Tidak ada biografi deskripsi.')
                    .setFooter({ text: `Nama Jepang: ${char.name_kanji || 'N/A'}` });

                return isInteraction ? await context.editReply({ embeds: [charEmbed] }) : await context.reply({ embeds: [charEmbed] });
            }

            // --- CASE 5: MANGA ---
            if (subcommand === 'manga') {
                const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(textQuery)}&limit=1`);
                const resData = await response.json();

                if (!resData.data || resData.data.length === 0) {
                    const noManga = { content: 'Manga tidak ditemukan.' };
                    return isInteraction ? context.editReply(noManga) : context.reply(noManga);
                }

                const manga = resData.data[0];
                const mangaEmbed = new EmbedBuilder()
                    .setTitle(manga.title)
                    .setURL(manga.url)
                    .setColor('#f1c40f')
                    .setThumbnail(manga.images.jpg.image_url)
                    .setDescription(manga.synopsis ? manga.synopsis.substring(0, 800) + '...' : 'Tidak ada sinopsis.')
                    .addFields(
                        { name: '📖 Tipe', value: `${manga.type || 'N/A'}`, inline: true },
                        { name: '📚 Chapters/Vols', value: `Ch: ${manga.chapters || '?'} / Vol: ${manga.volumes || '?'}`, inline: true },
                        { name: '⭐ Skor', value: `${manga.score || 'N/A'}`, inline: true }
                    );

                return isInteraction ? await context.editReply({ embeds: [mangaEmbed] }) : await context.reply({ embeds: [mangaEmbed] });
            }

            // --- CASE 6: QUOTE ---
            if (subcommand === 'quote') {
                const response = await fetch('https://some-random-api.com/anime/quotes');
                const data = await response.json();

                const quoteEmbed = new EmbedBuilder()
                    .setTitle('📜 Anime Quote')
                    .setColor('#9b59b6')
                    .setDescription(`*"${data.sentence}"*`)
                    .addFields(
                        { name: '👤 Karakter', value: data.character, inline: true },
                        { name: '🎬 Anime', value: data.anime, inline: true }
                    );

                return isInteraction ? await context.editReply({ embeds: [quoteEmbed] }) : await context.reply({ embeds: [quoteEmbed] });
            }

            // --- CASE 7: RECOMMEND ---
            if (subcommand === 'recommend') {
                const response = await fetch('https://api.jikan.moe/v4/random/anime');
                const resData = await response.json();
                const anime = resData.data;

                const recEmbed = new EmbedBuilder()
                    .setTitle(`🎯 Rekomendasi Hari Ini: ${anime.title}`)
                    .setURL(anime.url)
                    .setColor('#1abc9c')
                    .setThumbnail(anime.images.jpg.image_url)
                    .setDescription(anime.synopsis ? anime.synopsis.substring(0, 500) + '...' : 'Tidak ada deskripsi sinopsis.')
                    .addFields(
                        { name: '⭐ Skor', value: `${anime.score || 'N/A'}`, inline: true },
                        { name: '📺 Tipe', value: `${anime.type || 'N/A'}`, inline: true }
                    );

                return isInteraction ? await context.editReply({ embeds: [recEmbed] }) : await context.reply({ embeds: [recEmbed] });
            }

        } catch (error) {
            logger.error(`[ANIME SUBCOMMAND SYSTEM ERROR - ${subcommand.toUpperCase()}]`, error);
            const errFallback = { content: 'Sistem sedang sibuk menghubungi server eksternal, silakan coba beberapa saat lagi.' };
            return isInteraction ? await context.editReply(errFallback) : await context.reply(errFallback);
        }
    }
};