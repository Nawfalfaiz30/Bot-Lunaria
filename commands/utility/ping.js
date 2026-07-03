const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latency', 'p'],
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mengecek latensi dan kecepatan respon bot.'),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        
        const createdTimestamp = isSlash ? context.createdTimestamp : context.createdTimestamp;
        
        // Kirim pesan awal untuk menghitung selisih waktu
        const msg = await context.reply({ content: '🏓 Mengukur jaringan...', fetchReply: true });

        const pingEmbed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor('#2ecc71')
            .addFields(
                { name: '🤖 Respon Bot', value: `\`${msg.createdTimestamp - context.createdTimestamp}ms\``, inline: true },
                { name: '🌐 WebSocket API', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true }
            )
            .setTimestamp();

        if (isSlash) await context.editReply({ content: null, embeds: [pingEmbed] });
        else await msg.edit({ content: null, embeds: [pingEmbed] });
    }
};