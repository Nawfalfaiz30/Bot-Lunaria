const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'poll',
    aliases: ['voting', 'tanyavote'],
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Membuat bilik pemungutan suara (Poll) cepat.')
        .addStringOption(option => option.setName('pertanyaan').setDescription('Topik pemungutan suara').setRequired(true)),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const question = isSlash ? context.options.getString('pertanyaan') : args.join(' ');
        const author = isSlash ? context.user : context.author;

        if (!question) return context.reply({ content: 'Sertakan topik pertanyaan voting!', ephemeral: true });

        const pollEmbed = new EmbedBuilder()
            .setTitle('📊 PEMUNGUTAN SUARA / POLL')
            .setColor('#9b59b6')
            .setDescription(question)
            .addFields(
                { name: '🟢 Pilihan Ya', value: 'Bereaksi dengan 👍 jika setuju.', inline: true },
                { name: '🔴 Pilihan Tidak', value: 'Bereaksi dengan 👎 jika menolak.', inline: true }
            )
            .setFooter({ text: `Diajukan oleh: ${author.username}` })
            .setTimestamp();

        const msg = await context.reply({ embeds: [pollEmbed], fetchReply: true });
        await msg.react('👍');
        await msg.react('👎');
    }
};