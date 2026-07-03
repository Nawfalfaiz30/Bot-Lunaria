const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'triggered',
    aliases: ['trigger', 'marah'],
    data: new SlashCommandBuilder()
        .setName('triggered')
        .setDescription('Membuat efek Triggered (GIF) pada foto profil.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('User yang ingin diedit fotonya')
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const target = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;

        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
        const apiUrl = `https://some-random-api.com/canvas/overlay/triggered?avatar=${encodeURIComponent(avatarUrl)}`;

        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle(`💢 TRIGGERED: ${target.username}`)
            .setImage(apiUrl);

        await context.reply({ embeds: [embed] });
    }
};