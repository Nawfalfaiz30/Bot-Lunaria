const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    const u1 = interaction.options.getUser('user1');
    const u2 = interaction.options.getUser('user2') || interaction.user;

    if (u1.id === u2.id) return interaction.reply({ content: 'Kamu tidak bisa memasangkan dirimu sendiri!', ephemeral: true });

    const targetPercentage = Math.floor(Math.random() * 101);
    let bar = '⬛'.repeat(10);
    const progress = Math.round(targetPercentage / 10);
    if (progress > 0) bar = '❤️'.repeat(progress) + '⬛'.repeat(10 - progress);

    let comment = '💔 Hubungan yang mustahil...';
    if (targetPercentage > 25) comment = '⚠️ Butuh banyak usaha dan kompromi.';
    if (targetPercentage > 50) comment = '👍 Kecocokan yang lumayan baik!';
    if (targetPercentage > 75) comment = '💖 Pasangan serasi! Langsung gas pelaminan!';

    const embed = new EmbedBuilder()
        .setTitle('💘 Lunaria Love Radar')
        .setDescription(`Mengecek kecocokan antara **${u1.username}** & **${u2.username}**...\n\n**${targetPercentage}%**\n${bar}\n\n*${comment}*`)
        .setColor(targetPercentage > 50 ? '#F04A93' : '#4F545C');

    await interaction.reply({ embeds: [embed] });
};