const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'petpet',
    aliases: ['pet', 'elus'],
    data: new SlashCommandBuilder()
        .setName('petpet')
        .setDescription('Mengelus (pet-pet) kepala user.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('User yang ingin dielus')
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const target = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;

        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
        const apiUrl = `https://api.popcat.xyz/pet?image=${encodeURIComponent(avatarUrl)}`;

        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle(`🖐️ Mengelus ${target.username}...`)
            .setImage(apiUrl);

        await context.reply({ embeds: [embed] });
    }
};