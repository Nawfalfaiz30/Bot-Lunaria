const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'empty',
    isDistube: true,
    execute(queue, client) {
        const emptyEmbed = new EmbedBuilder()
            .setColor('#e67e22') // Oranye
            .setTitle('👻 Channel Kosong')
            .setDescription('Semua orang telah meninggalkan Voice Channel. Aku menghentikan musik dan keluar untuk menghemat energi!')
            .setTimestamp();

        queue.textChannel.send({ embeds: [emptyEmbed] });
    }
};