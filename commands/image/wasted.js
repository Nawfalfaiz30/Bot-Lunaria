const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'wasted',
    aliases: ['gta', 'mati'],
    data: new SlashCommandBuilder()
        .setName('wasted')
        .setDescription('Memberikan efek WASTED ala GTA ke foto profil.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('User yang ingin diedit fotonya')
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const target = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;

        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
        const apiUrl = `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(avatarUrl)}`;

        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle(`💀 WASTED: ${target.username}`)
            .setImage(apiUrl);

        await context.reply({ embeds: [embed] });
    }
};