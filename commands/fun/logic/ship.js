const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    // Deteksi apakah ini Slash Command (Interaction) atau Prefix Command (Message)
    const isInteraction = !interaction.author; 

    let u1, u2;

    if (isInteraction) {
        // Jalur jika dipanggil via Slash Command
        u1 = interaction.options.getUser('user1');
        u2 = interaction.options.getUser('user2') || interaction.user;
    } else {
        // Jalur jika dipanggil via Prefix Command (Mengambil dari Mention chat)
        const mentions = interaction.mentions.users;
        u1 = mentions.first();
        u2 = mentions.at(1) || interaction.author;
    }

    // Validasi jika user pertama tidak ditemukan (misal user lupa mention di prefix command)
    if (!u1) {
        const errorContent = '⚠️ Kamu harus menyebutkan (mention) minimal satu user! Contoh: `!ship @User`';
        if (isInteraction) {
            return interaction.reply({ content: errorContent, ephemeral: true });
        } else {
            return interaction.reply({ content: errorContent });
        }
    }

    if (u1.id === u2.id) {
        return interaction.reply({ 
            content: 'Kamu tidak bisa memasangkan dirimu sendiri!', 
            ephemeral: isInteraction 
        });
    }

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

    // Mengirim pesan secara aman sesuai jenis command
    if (isInteraction) {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    } else {
        await interaction.reply({ embeds: [embed] });
    }
};