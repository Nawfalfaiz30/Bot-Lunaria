const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'serverstatus',
    aliases: ['serverinfo', 'guildinfo'],
    data: new SlashCommandBuilder()
        .setName('serverstatus')
        .setDescription('Menampilkan dashboard infografis kondisi server saat ini.'),

    async execute(context, args, client) {
        const { guild } = context;
        
        // Kalkulasi data member & bot
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = totalMembers - botCount;

        // Kalkulasi data channel
        const totalChannels = guild.channels.cache.size;
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;

        const embed = new EmbedBuilder()
            .setColor('#0f111a')
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setTitle('📊 DASHBOARD INFOGRAFIS SERVER')
            .setDescription(`Server ini didirikan oleh <@${guild.ownerId}> pada ${time(guild.createdAt, 'F')}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { 
                    name: '👥 Kependudukan Server', 
                    value: `• Total Jiwa: **${totalMembers}**\n• Manusia: \`${humanCount}\`\n• Bot Sistem: \`${botCount}\``, 
                    inline: true 
                },
                { 
                    name: '🛡️ Keamanan & Level', 
                    value: `• Verification: \`${guild.verificationLevel}\`\n• Tier Boost: **Tier ${guild.premiumTier}**\n• Jumlah Booster: \`${guild.premiumSubscriptionCount || 0}\` `, 
                    inline: true 
                },
                { 
                    name: '📂 Arsitektur Ruang', 
                    value: `• Total Channel: **${totalChannels}**\n• Teks: \`${textChannels}\`\n• Suara (Voice): \`${voiceChannels}\``, 
                    inline: false 
                }
            )
            .setFooter({ text: `ID Server: ${guild.id}` })
            .setTimestamp();

        await context.reply({ embeds: [embed] });
    }
};