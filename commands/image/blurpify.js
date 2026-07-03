const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'blurpify',
    aliases: ['blurple'],
    data: new SlashCommandBuilder()
        .setName('blurpify')
        .setDescription('Mengubah foto profil menjadi warna Blurple khas Discord.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('User yang ingin diedit fotonya')
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const target = isSlash ? context.options.getUser('target') || context.user : context.mentions.users.first() || context.author;

        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
        const apiUrl = `https://some-random-api.com/canvas/filter/blurple?avatar=${encodeURIComponent(avatarUrl)}`;

        const embed = new EmbedBuilder()
            .setColor('#5865F2') // Warna Blurple
            .setTitle(`🖌️ Blurpify: ${target.username}`)
            .setImage(apiUrl)
            .setFooter({ text: 'Powered by Some Random API' });

        await context.reply({ embeds: [embed] });
    }
};