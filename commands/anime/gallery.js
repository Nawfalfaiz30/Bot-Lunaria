const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'gallery',
    aliases: ['waifu', 'mywaifu', 'husbando', 'myhusbando', 'cosplay', 'animeart'],
    data: new SlashCommandBuilder()
        .setName('gallery')
        .setDescription('Mengambil visual gambar ilustrasi fanart anime dari galeri.')
        .addStringOption(option =>
            option.setName('kategori')
                .setDescription('Pilih tipe galeri gambar yang ingin dimuat')
                .setRequired(true)
                .addChoices(
                    { name: 'Waifu (Karakter Wanita)', value: 'waifu' },
                    { name: 'Husbando (Karakter Pria)', value: 'husbando' },
                    { name: 'Cosplay (Kostum Seni / Kitsune)', value: 'cosplay' }
                )
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;

        // 1. DETEKSI KATEGORI (Hybrid Mode)
        let category = '';
        if (isInteraction) {
            category = context.options.getString('kategori');
        } else {
            const commandCalled = context.content.split(' ')[0].slice(client.prefix?.length || 1).toLowerCase();
            if (['waifu', 'mywaifu'].includes(commandCalled)) category = 'waifu';
            else if (['husbando', 'myhusbando'].includes(commandCalled)) category = 'husbando';
            else if (['cosplay', 'animeart'].includes(commandCalled)) category = 'cosplay';
            else if (commandCalled === 'gallery' && args[0]) category = args[0].toLowerCase();
            
            if (!['waifu', 'husbando', 'cosplay'].includes(category)) {
                return context.reply({ content: 'Kategori tidak valid! Gunakan alias: `!waifu`, `!husbando`, atau `!cosplay`.' });
            }
        }

        if (context.deferReply) await context.deferReply();

        // 2. CONFIGURATION DATA MAPPING
        let apiEndpoint = `https://nekos.best/api/v2/${category}`;
        let embedTitle = '🎭 Anime Visual Gallery';
        let embedColor = '#f1c40f';

        if (category === 'waifu') {
            embedTitle = '🌸 Waifu Terpilih';
            embedColor = '#ff79c6';
        } else if (category === 'husbando') {
            embedTitle = '✨ Husbando Terpilih';
            embedColor = '#8be9fd';
        } else if (category === 'cosplay') {
            apiEndpoint = 'https://nekos.best/api/v2/kitsune'; // Endpoint visual alternatif yang aman
        }

        // 3. FETCH DATA & SEND RESPONSE
        try {
            const response = await fetch(apiEndpoint);
            const data = await response.json();
            const result = data.results[0];

            if (result.artist_name && category !== 'cosplay') {
                embedTitle += `: ${result.artist_name}`;
            }

            const galleryEmbed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setColor(embedColor)
                .setImage(result.url)
                .setFooter({ text: `Artist: ${result.artist_name || 'Unknown'}` });

            return isInteraction 
                ? await context.editReply({ embeds: [galleryEmbed] }) 
                : await context.reply({ embeds: [galleryEmbed] });

        } catch (error) {
            logger.error(`[GALLERY ERROR - ${category.toUpperCase()}]`, error);
            const errMsg = { content: `Gagal memuat galeri gambar ${category}, silakan coba beberapa saat lagi.` };
            
            return isInteraction 
                ? await context.editReply(errMsg) 
                : await context.reply(errMsg);
        }
    }
};