const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'whois', 'user'],
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Melihat detail informasi profil akun pengguna.')
        .addUserOption(option => option.setName('target').setDescription('User yang ingin dianalisis')),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const targetUser = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;

        const member = await context.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return context.reply({ content: 'Pengguna tidak ditemukan di server ini.', ephemeral: true });

        // Ambil daftar role (kecuali @everyone)
        const roles = member.roles.cache
            .filter(r => r.id !== context.guild.roles.everyone.id)
            .map(r => r.toString())
            .join(', ') || 'None';

        const uiEmbed = new EmbedBuilder()
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor(member.displayHexColor || '#3498db')
            .addFields(
                { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '🏷️ Nickname', value: `${member.nickname || 'Tidak ada'}`, inline: true },
                { name: '📆 Terdaftar Discord', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false },
                { name: '📥 Bergabung Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles }
            )
            .setTimestamp();

        await context.reply({ embeds: [uiEmbed] });
    }
};