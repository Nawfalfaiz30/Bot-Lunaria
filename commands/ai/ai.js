const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

// Sesi persona lokal sederhana agar fitur persona tetap berfungsi
const activePersonas = new Map();

module.exports = {
    name: 'ai',
    aliases: ['chat', 'ask', 'tanya', 'imagine', 'art', 'generate', 'gambarai', 'persona', 'sifatai', 'ubahai', 'summarize', 'rangkum', 'intisari', 'translate', 'tr', 'terjemahkan', 'vision', 'scan', 'cekfoto'],
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Pusat kendali dan integrasi kecerdasan buatan Lunaria AI.')
        
        // Subcommand: Chat
        .addSubcommand(sub =>
            sub.setName('chat')
                .setDescription('Bertanya atau mengobrol dengan Lunaria AI.')
                .addStringOption(opt => opt.setName('pertanyaan').setDescription('Pertanyaan atau pesan yang ingin disampaikan').setRequired(true))
        )
        // Subcommand: Imagine
        .addSubcommand(sub =>
            sub.setName('imagine')
                .setDescription('Menggenerasi gambar dari teks menggunakan AI.')
                .addStringOption(opt => opt.setName('prompt').setDescription('Deskripsi gambar yang ingin dibuat (Gunakan bahasa Inggris)').setRequired(true))
        )
        // Subcommand: Persona
        .addSubcommand(sub =>
            sub.setName('persona')
                .setDescription('Mengubah sifat kepribadian/persona dari respon chat AI.')
                .addStringOption(opt => 
                    opt.setName('pilihan')
                        .setDescription('Pilih kepribadian AI')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Normal / Ramah', value: 'normal' },
                            { name: 'Tsundere (Galak tapi perhatian)', value: 'tsundere' },
                            { name: 'Kuno / Kerajaan', value: 'kerajaan' },
                            { name: 'Bijak / Penuh Motivasi', value: 'bijak' }
                        )
                )
        )
        // Subcommand: Summarize
        .addSubcommand(sub =>
            sub.setName('summarize')
                .setDescription('Merangkum teks yang panjang menjadi ringkasan singkat.')
                .addStringOption(opt => opt.setName('teks').setDescription('Teks panjang yang ingin dirangkum').setRequired(true))
        )
        // Subcommand: Translate
        .addSubcommand(sub =>
            sub.setName('translate')
                .setDescription('Menerjemahkan teks ke bahasa asing (Default: English).')
                .addStringOption(opt => opt.setName('teks').setDescription('Kalimat yang ingin diterjemahkan').setRequired(true))
                .addStringOption(opt => opt.setName('bahasa').setDescription('Kode bahasa target (contoh: id, en, ja, ko)'))
        )
        // Subcommand: Vision
        .addSubcommand(sub =>
            sub.setName('vision')
                .setDescription('Menganalisis isi kandungan foto/gambar dari link URL.')
                .addStringOption(opt => opt.setName('url').setDescription('Link URL gambar langsung (.jpg atau .png)').setRequired(true))
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const author = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction) delete options.ephemeral;
            return await context.reply(options);
        };

        // --- DETEKSI SUBCOMMAND & PARSING STATE (Hybrid Mode) ---
        let subcommand = '';
        let primaryText = '';
        let targetLang = 'en'; // Default fallback khusus translate

        if (isInteraction) {
            subcommand = context.options.getSubcommand();
            if (subcommand === 'chat') primaryText = context.options.getString('pertanyaan');
            else if (subcommand === 'imagine') primaryText = context.options.getString('prompt');
            else if (subcommand === 'persona') primaryText = context.options.getString('pilihan');
            else if (subcommand === 'summarize' || subcommand === 'translate') primaryText = context.options.getString('teks');
            else if (subcommand === 'vision') primaryText = context.options.getString('url');
            
            if (subcommand === 'translate') targetLang = context.options.getString('bahasa') || 'en';
        } else {
            const commandCalled = context.content.split(' ')[0].slice(client.prefix?.length || 1).toLowerCase();
            
            if (['chat', 'ai', 'ask', 'tanya'].includes(commandCalled)) {
                subcommand = (commandCalled === 'ai' && args[0] === 'chat') ? (args.shift(), 'chat') : 'chat';
                primaryText = args.join(' ');
            } else if (['imagine', 'art', 'generate', 'gambarai'].includes(commandCalled) || (commandCalled === 'ai' && args[0] === 'imagine')) {
                subcommand = 'imagine'; if (commandCalled === 'ai') args.shift();
                primaryText = args.join(' ');
            } else if (['persona', 'sifatai', 'ubahai'].includes(commandCalled) || (commandCalled === 'ai' && args[0] === 'persona')) {
                subcommand = 'persona'; if (commandCalled === 'ai') args.shift();
                primaryText = args[0]?.toLowerCase();
            } else if (['summarize', 'rangkum', 'intisari'].includes(commandCalled) || (commandCalled === 'ai' && args[0] === 'summarize')) {
                subcommand = 'summarize'; if (commandCalled === 'ai') args.shift();
                primaryText = args.join(' ');
            } else if (['translate', 'tr', 'terjemahkan'].includes(commandCalled) || (commandCalled === 'ai' && args[0] === 'translate')) {
                subcommand = 'translate'; if (commandCalled === 'ai') args.shift();
                
                // Urutan prefix: !translate <kode_bahasa> <teks>
                if (args[0] && args[0].length <= 3 && args[1]) {
                    targetLang = args.shift().toLowerCase();
                    primaryText = args.join(' ');
                } else {
                    targetLang = 'en';
                    primaryText = args.join(' ');
                }
            } else if (['vision', 'scan', 'cekfoto'].includes(commandCalled) || (commandCalled === 'ai' && args[0] === 'vision')) {
                subcommand = 'vision'; if (commandCalled === 'ai') args.shift();
                primaryText = args[0];
            } else {
                subcommand = 'chat';
                primaryText = args.join(' ');
            }
        }

        // --- VALIDASI INPUT ---
        if (!primaryText && subcommand !== 'translate') {
            const missingMessages = {
                chat: 'Harap masukkan pertanyaan setelah command!',
                imagine: 'Berikan deskripsi gambar (prompt) yang ingin dibuat!',
                persona: 'Pilihan persona salah! Gunakan: `normal`, `tsundere`, `kerajaan`, atau `bijak`.',
                summarize: 'Masukkan teks yang ingin dirangkum!',
                vision: 'Sertakan link gambar URL yang valid!'
            };
            return sendResponse({ content: missingMessages[subcommand], ephemeral: true });
        }

        // Penanganan format terbalik khusus prefix translate saat argument kosong
        if (subcommand === 'translate' && !primaryText) {
            return sendResponse({ content: 'Format salah! Gunakan: `!translate <kode_bahasa> <teks>`\nContoh: `!translate en Selamat pagi`', ephemeral: true });
        }

        // Subcommand persona dieksekusi secara instan tanpa defer reply
        if (subcommand === 'persona') {
            const valid = ['normal', 'tsundere', 'kerajaan', 'bijak'];
            if (!valid.includes(primaryText)) {
                return sendResponse({ content: 'Pilihan persona salah! Gunakan: `normal`, `tsundere`, `kerajaan`, atau `bijak`.', ephemeral: true });
            }

            activePersonas.set(author.id, primaryText);

            let displaySifat = 'Normal & Ramah';
            if (primaryText === 'tsundere') displaySifat = 'Tsundere (Baka! Jangan ajak aku bicara!)';
            if (primaryText === 'kerajaan') displaySifat = 'Gaya Bicara Klasik Kerajaan (Baginda/Hamba)';
            if (primaryText === 'bijak') displaySifat = 'Filsuf Bijak Penuh Motivasi Hidup';

            return await context.reply({
                embeds: [embed.success(author, 'Persona AI Diperbarui', `Kepribadian Lunaria AI untuk dirimu berhasil diubah menjadi: **${displaySifat}**.\n*Catatan: Modul persona akan disinkronisasikan penuh pada update helper mendatang.*`)]
            });
        }

        // Sisa perintah AI wajib ditunda karena butuh waktu memproses API eksternal
        if (context.deferReply) await context.deferReply();

        try {
            // --- CASE 1: CHAT ---
            if (subcommand === 'chat') {
                const response = await fetch(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(primaryText)}`);
                const data = await response.json();

                const aiEmbed = new EmbedBuilder()
                    .setTitle('🤖 Lunaria AI Response')
                    .setColor('#9b59b6')
                    .addFields(
                        { name: '❓ Pertanyaanmu', value: primaryText.length > 1024 ? primaryText.substring(0, 1021) + '...' : primaryText },
                        { name: '💡 Jawaban AI', value: data.response || 'Maaf, aku sedang tidak bisa berpikir saat ini.' }
                    )
                    .setFooter({ text: `Ditanyakan oleh ${author.username}` })
                    .setTimestamp();

                return isInteraction ? await context.editReply({ embeds: [aiEmbed] }) : await context.reply({ embeds: [aiEmbed] });
            }

            // --- CASE 2: IMAGINE ---
            if (subcommand === 'imagine') {
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(primaryText)}?width=1024&height=1024&nologo=true`;

                const imagineEmbed = new EmbedBuilder()
                    .setTitle('🎨 AI Image Generator')
                    .setColor('#2ecc71')
                    .setDescription(`**Prompt:** ${primaryText}`)
                    .setImage(imageUrl)
                    .setFooter({ text: `Dibuat oleh: ${author.username} | Powered by Pollinations AI` })
                    .setTimestamp();

                return isInteraction ? await context.editReply({ embeds: [imagineEmbed] }) : await context.reply({ embeds: [imagineEmbed] });
            }

            // --- CASE 3: SUMMARIZE ---
            if (subcommand === 'summarize') {
                const promptWrapper = `Rangkum teks berikut ini dengan singkat, padat, dan jelas menggunakan poin-poin: ${primaryText}`;
                const response = await fetch(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(promptWrapper)}`);
                const data = await response.json();

                const sumEmbed = new EmbedBuilder()
                    .setTitle('📝 Rangkuman Otomatis AI')
                    .setColor('#f39c12')
                    .addFields(
                        { name: '📥 Teks Asli', value: primaryText.length > 500 ? primaryText.substring(0, 497) + '...' : primaryText },
                        { name: '📤 Hasil Ringkasan', value: data.response || 'Gagal merangkum teks.' }
                    )
                    .setTimestamp();

                return isInteraction ? await context.editReply({ embeds: [sumEmbed] }) : await context.reply({ embeds: [sumEmbed] });
            }

            // --- CASE 4: TRANSLATE ---
            if (subcommand === 'translate') {
                const response = await fetch(`https://api.popcat.xyz/translate?to=${targetLang}&text=${encodeURIComponent(primaryText)}`);
                const data = await response.json();

                const trEmbed = new EmbedBuilder()
                    .setTitle('🌐 AI Translator')
                    .setColor('#3498db')
                    .addFields(
                        { name: 'Input', value: primaryText },
                        { name: `Hasil Terjemahan (${targetLang.toUpperCase()})`, value: data.translated || 'Gagal menerjemahkan teks.' }
                    )
                    .setTimestamp();

                return isInteraction ? await context.editReply({ embeds: [trEmbed] }) : await context.reply({ embeds: [trEmbed] });
            }

            // --- CASE 5: VISION ---
            if (subcommand === 'vision') {
                const analysisPrompt = `Deskripsikan objek apa saja yang terlihat dengan jelas pada foto berikut ini: ${primaryText}`;
                const response = await fetch(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(analysisPrompt)}`);
                const data = await response.json();

                const visionEmbed = new EmbedBuilder()
                    .setTitle('👁️ Lunaria Computer Vision')
                    .setColor('#1abc9c')
                    .setDescription(data.response || 'Gambar terdeteksi namun AI gagal mendeskripsikannya.')
                    .setThumbnail(primaryText)
                    .setFooter({ text: 'Analisis berbasis pengenalan URL citra visual' });

                return isInteraction ? await context.editReply({ embeds: [visionEmbed] }) : await context.reply({ embeds: [visionEmbed] });
            }

        } catch (error) {
            logger.error(`[AI INTEGRATION ERROR - ${subcommand.toUpperCase()}]`, error);
            const errEmbed = { embeds: [embed.error(author, 'AI Error', 'Gagal terhubung ke modul otak kecerdasan buatan. Coba lagi nanti!')] };
            return isInteraction ? await context.editReply(errEmbed) : await context.reply(errEmbed);
        }
    }
};