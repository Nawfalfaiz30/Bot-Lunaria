const GuildSettings = require('../../models/guildSchema');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'messageUpdate',
    once: false,
    async execute(oldMessage, newMessage, client) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        
        // Abaikan jika isinya sama (biasanya Discord hanya me-load embed link)
        if (oldMessage.content === newMessage.content) return; 

        try {
            const guildData = await GuildSettings.findOne({ guildId: oldMessage.guild.id });
            if (!guildData || !guildData.logChannel) return;

            const logChannel = oldMessage.guild.channels.cache.get(guildData.logChannel);
            if (!logChannel) return;

            const logEmbed = embed.info(
                oldMessage.author, 
                '✏️ Pesan Diedit', 
                `**Lokasi:** <#${oldMessage.channel.id}>\n[Klik untuk menuju pesan](${newMessage.url})\n\n**Sebelum:**\n${oldMessage.content || 'Kosong'}\n\n**Sesudah:**\n${newMessage.content || 'Kosong'}`
            ).setColor('#f1c40f'); // Kuning

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {}
    }
};