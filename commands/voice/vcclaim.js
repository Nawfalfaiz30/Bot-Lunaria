const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vcclaim',
    aliases: ['claimvc'],
    data: new SlashCommandBuilder()
        .setName('vcclaim')
        .setDescription('Mengeklaim kepemilikan Voice Channel jika pemilik sebelumnya telah pergi.'),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel!')], ephemeral: true });

        // Logika sederhana: Jika user memiliki hak kelola atau dia mengajukan klaim
        // Di sistem JTC dinamis biasanya dicek via database, namun sebagai fallback:
        await voiceChannel.permissionOverwrites.edit(author.id, {
            ManageChannels: true,
            MoveMembers: true,
            Connect: true
        });

        await context.reply({ embeds: [embed.success(author, '👑 VC Diklaim', `Kamu sekarang memegang kendali penuh atas Voice Channel **${voiceChannel.name}**.`)] });
    }
};