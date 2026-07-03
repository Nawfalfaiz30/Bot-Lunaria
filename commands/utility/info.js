const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');

module.exports = {
    name: 'info',
    aliases: ['botinfo', 'about'],
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Menampilkan statistik dan informasi performa bot Lunaria.'),

    async execute(context, args, client) {
        // Kalkulasi Uptime
        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Penggunaan Memori
        const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const infoEmbed = new EmbedBuilder()
            .setTitle('📊 Lunaria System Information')
            .setColor('#9b59b6')
            .addFields(
                { name: '👥 Total Pengguna', value: `\`${client.users.cache.size}\` Users`, inline: true },
                { name: '🖥️ Total Server', value: `\`${client.guilds.cache.size}\` Servers`, inline: true },
                { name: '⏱️ Waktu Aktif', value: `\`${uptimeString}\``, inline: false },
                { name: '📦 Library v.', value: `Discord.js \`v${djsVersion}\``, inline: true },
                { name: '⚙️ Node v.', value: `\`${process.version}\``, inline: true },
                { name: '💾 RAM Terpakai', value: `\`${memoryUsed} MB\``, inline: true }
            )
            .setTimestamp();

        await context.reply({ embeds: [infoEmbed] });
    }
};