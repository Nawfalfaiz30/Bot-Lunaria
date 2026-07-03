const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vclock',
    aliases: ['vclok', 'kuncivc'],
    data: new SlashCommandBuilder()
        .setName('vclock')
        .setDescription('Mengunci Voice Channel agar orang lain tidak bisa bergabung.'),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel!')], ephemeral: true });

        if (!context.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return context.reply({ embeds: [embed.error(author, 'Ditolak', 'Kamu tidak memiliki izin untuk mengunci channel ini.')], ephemeral: true });
        }

        await voiceChannel.permissionOverwrites.edit(context.guild.roles.everyone, {
            Connect: false
        });

        await context.reply({ embeds: [embed.success(author, '🔒 VC Dikunci', `Voice Channel berhasil dikunci. Tidak ada member baru yang bisa masuk.`)] });
    }
};