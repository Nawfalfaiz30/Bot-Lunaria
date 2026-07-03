const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    const question = interaction.options.getString('pertanyaan');
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