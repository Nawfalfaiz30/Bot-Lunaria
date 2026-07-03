const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vclimit',
    aliases: ['vcl', 'limitvc'],
    data: new SlashCommandBuilder()
        .setName('vclimit')
        .setDescription('Mengatur batas jumlah maksimal user di Voice Channel-mu.')
        .addIntegerOption(option => 
            option.setName('jumlah')
                .setDescription('Batas user (0 untuk tanpa batas, maks 99)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(99)
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const limit = isSlash ? context.options.getInteger('jumlah') : parseInt(args[0]);

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel terlebih dahulu!')], ephemeral: true });

        // Validasi izin (Hanya pembuat VC atau yang punya hak Manage Channels)
        if (!context.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return context.reply({ embeds: [embed.error(author, 'Ditolak', 'Kamu tidak memiliki izin untuk memodifikasi Voice Channel ini.')], ephemeral: true });
        }

        if (isNaN(limit) || limit < 0 || limit > 99) {
            return context.reply({ embeds: [embed.error(author, 'Input Salah', 'Masukkan angka batas user antara 0 sampai 99.')], ephemeral: true });
        }

        await voiceChannel.setUserLimit(limit);
        await context.reply({ embeds: [embed.success(author, 'VC Diperbarui', `Batas maksimal user untuk VC **${voiceChannel.name}** berhasil diubah menjadi **${limit === 0 ? 'Tanpa Batas' : limit + ' User'}**.`)] });
    }
};