const GuildSettings = require('../../models/guildSchema');
const { voiceOwners } = require('../../helpers/voiceHelper');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'channelDelete',
    once: false,
    async execute(channel, client) {
        if (!channel.guild) return;

        // Cleanup: Jika channel yang dihapus adalah Private VC, hapus dari memori
        if (voiceOwners.has(channel.id)) {
            voiceOwners.delete(channel.id);
        }

        try {
            const guildData = await GuildSettings.findOne({ guildId: channel.guild.id });
            if (!guildData || !guildData.logChannel) return;

            const logChannel = channel.guild.channels.cache.get(guildData.logChannel);
            if (!logChannel) return;

            const logEmbed = new EmbedBuilder()
                .setColor('#c0392b')
                .setTitle('🗑️ Channel Dihapus')
                .setDescription(`Sebuah channel telah dihapus.\n**Nama:** \`${channel.name}\`\n**ID:** \`${channel.id}\``)
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {}
    }
};