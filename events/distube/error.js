const logger = require('../../helpers/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'error',
    isDistube: true,
    execute(error, queue, song, client) {
        // Tulis log merah di terminal
        logger.error('[DISTUBE ERROR] Kesalahan pemutaran musik:', error);

        // Jika antrean dan channel teks masih ada, beri tahu pengguna
        if (queue && queue.textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Terjadi Kesalahan Musik')
                .setDescription(`Maaf, terjadi kesalahan saat mencoba memutar musik.\n\`\`\`${error.message.slice(0, 500)}\`\`\``)
                .setTimestamp();

            queue.textChannel.send({ embeds: [errorEmbed] });
        }
    }
};