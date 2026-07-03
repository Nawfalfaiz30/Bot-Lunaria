const embed = require('../../helpers/embed');
const playdl = require('play-dl');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'playSong',
    isDistube: true, 
    async execute(queue, song, client) {
        queue.lastPlayedSong = song;

        if (!client.customAutoplayStates) client.customAutoplayStates = new Map();
        const isAutoplayOn = client.customAutoplayStates.get(queue.textChannel.guild.id) || false;

        if (isAutoplayOn) {
            (async () => {
                try {
                    let nextUrl = null;
                    try {
                        const videoInfo = await playdl.video_info(song.url);
                        if (videoInfo.related_videos && videoInfo.related_videos.length > 0) {
                            const pool = videoInfo.related_videos.slice(0, 5);
                            const chosenId = pool[Math.floor(Math.random() * pool.length)];
                            if (chosenId) nextUrl = `https://www.youtube.com/watch?v=${chosenId}`;
                        }
                    } catch (scrapeErr) {}

                    if (!nextUrl) {
                        const cleanKeyword = song.name.split(/[-|(|\[]/)[0].trim();
                        const searchResults = await playdl.search(`${cleanKeyword} music`, { limit: 3, source: { youtube: 'video' } }).catch(() => null);
                        if (searchResults && searchResults.length > 0) {
                            nextUrl = searchResults[Math.floor(Math.random() * searchResults.length)].url;
                        }
                    }

                    queue.nextAutoplayUrl = nextUrl;
                } catch (err) {
                    logger.error('[AUTOPLAY PRE-FETCH ERROR]', err);
                }
            })();
        }

        const playEmbed = embed.info(
            song.user, 
            '🎶 Sedang Memutar Lagu', 
            `**[${song.name}](${song.url})**\n\n⏱️ **Durasi:** \`${song.formattedDuration}\`\n👤 **Diminta oleh:** <@${song.user.id}>`
        ).setColor('#3498db');

        if (song.thumbnail) {
            playEmbed.setThumbnail(song.thumbnail);
        }

        if (queue.textChannel) {
            await queue.textChannel.send({ embeds: [playEmbed] }).catch(() => null);
        }
    }
};