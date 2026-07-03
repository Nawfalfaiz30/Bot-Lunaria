const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vcghost',
    aliases: ['vchantu', 'hidevc'],
    data: new SlashCommandBuilder()
        .setName('vcghost')
        .setDescription('Menyembunyikan Voice Channel dari daftar agar tidak terlihat oleh siapa pun.'),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel!')], ephemeral: true });

        if (!context.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return context.reply({ embeds: [embed.error(author, 'Ditolak', 'Kamu tidak memiliki izin untuk memodifikasi channel ini.')], ephemeral: true });
        }

        await voiceChannel.permissionOverwrites.edit(context.guild.roles.everyone, {
            ViewChannel: false
        });

        await context.reply({ embeds: [embed.success(author, '👻 Mode Ghost Aktif', `Voice Channel-mu sekarang tersembunyi sepenuhnya dari server.`)] });
    }
};