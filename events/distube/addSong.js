const embed = require('../../helpers/embed');

module.exports = {
    name: 'addSong',
    isDistube: true,
    execute(queue, song, client) {
        const addEmbed = embed.success(
            song.user, 
            '📝 Ditambahkan ke Antrean', 
            `**[${song.name}](${song.url})**\n\n⏱️ **Durasi:** \`${song.formattedDuration}\`\n👤 **Diminta oleh:** <@${song.user.id}>`
        );

        if (song.thumbnail) {
            addEmbed.setThumbnail(song.thumbnail);
        }

        queue.textChannel.send({ embeds: [addEmbed] });
    }
};