const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('action')
        .setDescription('Lakukan aksi roleplay seru bersama pengguna lain')
        .addStringOption(opt =>
            opt.setName('jenis')
                .setDescription('Pilih aksi yang ingin kamu lakukan')
                .setRequired(true)
                .addChoices(
                    { name: '🤗 Hug (Peluk)', value: 'hug' },
                    { name: '💋 Kiss (Cium)', value: 'kiss' },
                    { name: '🖐️ Slap (Tampar)', value: 'slap' },
                    { name: '🫳 Pat (Elus Kepala)', value: 'pat' }
                )
        )
        .addUserOption(opt =>
            opt.setName('target')
                .setDescription('Pengguna yang menjadi target aksimu')
                .setRequired(true)
        ),

    async execute(interaction) {
        const actionType = interaction.options.getString('jenis');
        const target = interaction.options.getUser('target');
        const author = interaction.user;

        if (target.id === author.id) {
            return interaction.reply({ 
                content: 'Kamu tidak bisa melakukan aksi ini ke dirimu sendiri! Carilah orang lain untuk diajak bermain. 🥺', 
                ephemeral: true 
            });
        }

        // Database URL GIF Anime (Bisa disesuaikan dengan koleksimu)
        const gifs = {
            hug: [
                'https://media.tenor.com/kCZjvhOe4iIAAAAC/anime-hug.gif',
                'https://media.tenor.com/xgovLtC5624AAAAC/anime-hug-hugs.gif'
            ],
            kiss: [
                'https://media.tenor.com/fQovNswgCx4AAAAC/anime-kiss.gif',
                'https://media.tenor.com/a25LxlGIl2AAAAAC/anime-kissing.gif'
            ],
            slap: [
                'https://media.tenor.com/LiBq2O6QQ4YAAAAC/anime-slap.gif',
                'https://media.tenor.com/XiYuU9ErSpMAAAAC/anime-slap-mad.gif'
            ],
            pat: [
                'https://media.tenor.com/Y7W71NWJ6dIAAAAC/anime-pat.gif',
                'https://media.tenor.com/4cO6_QkG98UAAAAC/anime-head-pat.gif'
            ]
        };

        // Pesan teks interaksi
        const messages = {
            hug: `🤗 **${author.username}** memeluk **${target.username}** dengan sangat erat! So sweet...`,
            kiss: `💋 **${author.username}** memberikan ciuman hangat ke **${target.username}**! Bersiaplah merona...`,
            slap: `🖐️ *PLAKK!* **${author.username}** menampar **${target.username}**! Waduh, ada masalah apa nih?`,
            pat: `🫳 **${author.username}** mengelus kepala **${target.username}** dengan lembut. *Good boy/girl!*`
        };

        const colors = {
            hug: '#FFB6C1',   // Pink cerah
            kiss: '#FF69B4',  // Pink tua
            slap: '#ED4245',  // Merah
            pat: '#57F287'    // Hijau lembut
        };

        const selectedGifs = gifs[actionType];
        const randomGif = selectedGifs[Math.floor(Math.random() * selectedGifs.length)];

        const embed = new EmbedBuilder()
            .setDescription(messages[actionType])
            .setImage(randomGif)
            .setColor(colors[actionType])
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};