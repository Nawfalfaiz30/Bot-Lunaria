const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'serveravatar',
    aliases: ['savi', 'guildavatar'],
    data: new SlashCommandBuilder()
        .setName('serveravatar')
        .setDescription('Mengambil avatar global dan avatar khusus server milik member.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('User yang ingin diambil avatarnya')
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const targetUser = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;
        
        // Mengambil member dari guild untuk mengecek avatar server
        const member = await context.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return context.reply({ content: 'Member tidak ditemukan di server ini.', ephemeral: true });

        const globalAvatar = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
        const serverAvatar = member.avatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: `Avatar Inspector: ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
            .setDescription(serverAvatar ? `✨ **${targetUser.username}** memiliki avatar khusus untuk server ini!` : `👤 Menampilkan avatar global **${targetUser.username}** (Tidak memiliki avatar khusus server).`)
            .setImage(serverAvatar || globalAvatar)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Buka Avatar Global')
                .setStyle(ButtonStyle.Link)
                .setURL(globalAvatar)
        );

        if (serverAvatar) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Buka Avatar Server')
                    .setStyle(ButtonStyle.Link)
                    .setURL(serverAvatar)
            );
        }

        if (isSlash) await context.reply({ embeds: [embed], components: [row] });
        else await context.reply({ embeds: [embed], components: [row] });
    }
};