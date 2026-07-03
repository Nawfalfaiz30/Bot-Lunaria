const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'vckick',
    aliases: ['vck', 'vcdisconnect'],
    data: new SlashCommandBuilder()
        .setName('vckick')
        .setDescription('Mengeluarkan member dari Voice Channel-mu.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Member yang ingin di-kick dari VC')
                .setRequired(true)
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const targetUser = isSlash ? context.options.getUser('target') : context.mentions.users.first();

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) return context.reply({ embeds: [embed.error(author, 'Gagal', 'Kamu harus berada di dalam Voice Channel!')], ephemeral: true });

        if (!context.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return context.reply({ embeds: [embed.error(author, 'Ditolak', 'Kamu tidak memiliki izin untuk memindahkan member di VC.')], ephemeral: true });
        }

        if (!targetUser) return context.reply({ content: 'Tag member yang ingin di-kick dari VC!', ephemeral: true });

        const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember || targetMember.voice.channelId !== voiceChannel.id) {
            return context.reply({ embeds: [embed.error(author, 'Gagal', 'Member tersebut tidak berada di Voice Channel yang sama denganmu.')], ephemeral: true });
        }

        // Putus koneksi voice dengan memindahkan ke null
        await targetMember.voice.setChannel(null);
        await context.reply({ embeds: [embed.success(author, 'Berhasil', `<@${targetUser.id}> telah ditendang keluar dari Voice Channel.`)] });
    }
};