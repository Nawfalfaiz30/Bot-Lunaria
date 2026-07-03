const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Menggunakan Map sederhana sebagai memori penyimpanan papan mural sementara (reset saat bot restart)
const muralMemory = new Map();

module.exports = {
    name: 'mural',
    aliases: ['mading', 'canvas'],
    data: new SlashCommandBuilder()
        .setName('mural')
        .setDescription('Menempelkan pesan atau kutipan ke papan mading server.')
        .addStringOption(option => 
            option.setName('pesan')
                .setDescription('Pesan yang ingin kamu tempel di mading server')
                .setRequired(true)
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const messageText = isSlash ? context.options.getString('pesan') : args.join(' ');
        const executor = isSlash ? context.user : context.author;
        const guildId = context.guild.id;

        if (!messageText) {
            return context.reply({ content: '❌ Tulis pesan yang ingin ditempel! Contoh: `ln!mural Semangat semuanya!`', ephemeral: true });
        }

        if (messageText.length > 80) {
            return context.reply({ content: '❌ Pesan terlalu panjang! Maksimal 80 karakter agar mading tetap rapi.', ephemeral: true });
        }

        // Ambil daftar pesan lama atau buat baru
        let serverMural = muralMemory.get(guildId) || [];
        
        // Format: Pesan baru masuk di antrean paling atas
        serverMural.unshift(`📌 "${messageText}" — *by ${executor.username}*`);
        
        // Batasi hanya menampilkan 5 pesan terakhir agar embed tidak kepanjangan
        if (serverMural.length > 5) serverMural.pop();
        muralMemory.set(guildId, serverMural);

        const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle(`📌 PAPAN MURAL KOMUNITAS: ${context.guild.name}`)
            .setDescription(serverMural.join('\n\n'))
            .setFooter({ text: 'Gunakan perintah ini lagi untuk menimpa pesan lama!' })
            .setTimestamp();

        await context.reply({ embeds: [embed] });
    }
};