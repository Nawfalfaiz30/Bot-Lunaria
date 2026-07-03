const GuildSettings = require('../../models/guildSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role, client) {
        try {
            const guildData = await GuildSettings.findOne({ guildId: role.guild.id });
            if (!guildData || !guildData.logChannel) return;

            const logChannel = role.guild.channels.cache.get(guildData.logChannel);
            if (!logChannel) return;

            const logEmbed = new EmbedBuilder()
                .setColor('#e67e22') // Oranye
                .setTitle('📛 Role Dihapus')
                .setDescription(`Sebuah role telah dihapus dari server.\n**Nama Role:** \`${role.name}\`\n**ID:** \`${role.id}\``)
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {}
    }
};