const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vcname',
    aliases: ['vcn', 'renamevc'],
    data: new SlashCommandBuilder()
        .setName('vcname')
        .setDescription('Mengubah nama Voice Channel-mu.')
        .addStringOption(option => 
            option.setName('nama')
                .setDescription('Nama baru untuk Voice Channel')
                .setRequired(true)
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const newName = isSlash ? context.options.getString('nama') : args.join(' ');

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel!')], ephemeral: true });

        if (!context.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return context.reply({ embeds: [embed.error(author, 'Ditolak', 'Kamu tidak memiliki izin untuk merename channel ini.')], ephemeral: true });
        }

        if (!newName) return context.reply({ content: 'Harap masukkan nama baru untuk Voice Channel!', ephemeral: true });

        await voiceChannel.setName(newName);
        await context.reply({ embeds: [embed.success(author, 'Nama Diubah', `Nama Voice Channel berhasil diubah menjadi: **${newName}**`)] });
    }
};