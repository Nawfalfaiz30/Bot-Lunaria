const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp', 'foto'],
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Menampilkan foto profil profil pengguna.')
        .addUserOption(option => option.setName('target').setDescription('User yang ingin dilihat fotonya')),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const target = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;

        const avatarPng = target.displayAvatarURL({ dynamic: true, format: 'png', size: 1024 });
        const avatarJpg = target.displayAvatarURL({ dynamic: true, format: 'jpg', size: 1024 });
        const avatarWebp = target.displayAvatarURL({ dynamic: true, format: 'webp', size: 1024 });

        const avEmbed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar: ${target.username}`)
            .setColor('#1abc9c')
            .setDescription(`🔗 Format Unduhan: **[PNG](${avatarPng})** | **[JPG](${avatarJpg})** | **[WEBP](${avatarWebp})**`)
            .setImage(avatarPng)
            .setTimestamp();

        await context.reply({ embeds: [avEmbed] });
    }
};