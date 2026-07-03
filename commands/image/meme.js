const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'meme',
    aliases: ['memes', 'lucu'],
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Menampilkan meme acak dari internet.'),

    async execute(context, args, client) {
        // Tampilkan status "sedang mengetik" karena request API butuh waktu
        if (context.deferReply) await context.deferReply(); 

        try {
            // Mengambil meme dari public API
            const response = await fetch('https://meme-api.com/gimme');
            const data = await response.json();

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(data.title)
                .setURL(data.postLink)
                .setImage(data.url)
                .setFooter({ text: `👍 ${data.ups} | 💬 r/${data.subreddit}` });

            const isSlash = context.options !== undefined;
            if (isSlash) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('[MEME ERROR]', error);
            const isSlash = context.options !== undefined;
            const errMsg = { content: 'Gagal memuat meme, coba lagi nanti!' };
            
            if (isSlash) await context.editReply(errMsg);
            else await context.reply(errMsg);
        }
    }
};