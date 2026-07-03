const playdl = require('play-dl');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'finishSong', 
    isDistube: true,    
    async execute(queue, song) {
        const client = queue.distube.client;
        if (!client.customAutoplayStates) client.customAutoplayStates = new Map();
        const isAutoplayOn = client.customAutoplayStates.get(queue.voiceChannel.guild.id) || false;

        if (isAutoplayOn && queue.songs.length <= 1) {
            const voiceChannel = queue.voiceChannel;
            const textChannel = queue.textChannel;
            const botMember = voiceChannel.guild.members.me;

            if (queue.nextAutoplayUrl) {
                try {
                    const nextUrl = queue.nextAutoplayUrl;
                    queue.nextAutoplayUrl = null; 

                    if (textChannel) {
                        await textChannel.send('✨ **[Autoplay]** Menyambung aliran musik sejenis berikutnya untukmu...').catch(() => null);
                    }

                    return await queue.distube.play(voiceChannel, nextUrl, {
                        textChannel: textChannel,
                        member: botMember
                    });
                } catch (err) {
                    logger.error('[AUTOPLAY INSTANT EXECUTE ERROR]', err);
                }
            } 
            else {
                // Jalankan pencarian cadangan senyap tanpa mengirim log teks ke konsol terminal
                (async () => {
                    try {
                        let fallbackUrl = null;
                        const cleanKeyword = song.name.split(/[-|(|\[]/)[0].trim();
                        const searchResults = await playdl.search(`${cleanKeyword} music`, { limit: 3, source: { youtube: 'video' } }).catch(() => null);
                        
                        if (searchResults && searchResults.length > 0) {
                            fallbackUrl = searchResults[Math.floor(Math.random() * searchResults.length)].url;
                        }

                        if (fallbackUrl) {
                            if (textChannel) {
                                await textChannel.send('✨ **[Autoplay]** Sesi baru diaktifkan, memutar lagu rekomendasi...').catch(() => null);
                            }

                            await client.distube.play(voiceChannel, fallbackUrl, {
                                textChannel: textChannel,
                                member: botMember
                            });
                        }
                    } catch (fallbackErr) {
                        logger.error('[AUTOPLAY EMERGENCY CRITICAL ERROR]', fallbackErr);
                    }
                })();
            }
        }
    }
};