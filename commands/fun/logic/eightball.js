const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction, args) => {
    // Deteksi apakah dijalankan lewat Slash Command atau Prefix Command
    const isInteraction = !interaction.author;
    let question = '';

    if (isInteraction) {
        // Jalur jika dipanggil via Slash Command
        question = interaction.options.getString('pertanyaan');
    } else {
        // Jalur jika dipanggil via Prefix Command (Teks Biasa)
        if (args && args.length > 0) {
            question = args.join(' ');
        } else {
            // Alternatif memotong kata pertama jika parameter args tidak ter-passing oleh handler utama
            question = interaction.content.split(/ +/).slice(1).join(' ');
        }
    }

    // Validasi jika user tidak memberikan pertanyaan sama sekali
    if (!question) {
        const errorContent = '⚠️ Kamu harus memberikan pertanyaan untuk ditanyakan ke Bola Ajaib!\nContoh: `!8ball Apakah hari ini aku beruntung?`';
        return interaction.reply({ content: errorContent, ephemeral: isInteraction });
    }

    const replies = [
        '🔮 Sangat yakin.',
        '🔮 Sudah pasti benar.',
        '🔮 Tanda-tanda menunjukkan iya.',
        '🔮 Coba tanya lagi nanti.',
        '🔮 Konsentrasi dan tanyakan lagi.',
        '🔮 Ramalanku mengatakan tidak.',
        '🔮 Sangat diragukan.',
        '🔮 Jangan berharap terlalu banyak.'
    ];
    const answer = replies[Math.floor(Math.random() * replies.length)];

    const embed = new EmbedBuilder()
        .setTitle('🎱 Bola Ajaib 8-Ball')
        .addFields(
            { name: 'Pertanyaan', value: question },
            { name: 'Jawaban Misterius', value: answer }
        )
        .setColor('#2F3136');

    await interaction.reply({ embeds: [embed] });
};