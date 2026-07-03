const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vcprivate',
    aliases: ['vcpriv', 'vcrahasia'],
    data: new SlashCommandBuilder()
        .setName('vcprivate')
        .setDescription('Mengubah Voice Channel menjadi privat (Hanya orang yang diizinkan yang bisa melihat).'),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel!')], ephemeral: true });

        if (!context.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return context.reply({ embeds: [embed.error(author, 'Ditolak', 'Kamu tidak memiliki izin untuk mengunci channel ini.')], ephemeral: true });
        }

        // Ubah permission @everyone agar tidak bisa melihat dan masuk channel
        await voiceChannel.permissionOverwrites.edit(context.guild.roles.everyone, {
            ViewChannel: false,
            Connect: false
        });

        // Pastikan pembuat tetap bisa masuk dan mengelola
        await voiceChannel.permissionOverwrites.edit(author.id, {
            ViewChannel: true,
            Connect: true
        });

        await context.reply({ embeds: [embed.success(author, '🔐 VC Privat', `Voice Channel-mu sekarang bersifat privat. Member lain tidak bisa melihat ataupun masuk.`)] });
    }
};