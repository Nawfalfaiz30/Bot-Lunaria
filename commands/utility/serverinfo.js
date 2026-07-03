const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'guildinfo', 'server'], 
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Menampilkan informasi dan statistik lengkap mengenai server ini.'),

    async execute(context, args, client) {
        const guild = context.guild;
        
        // 1. Logika Pembuatan Link Invite Otomatis & Permanen
        let permanentInviteLink = "#";
        try {
            const targetChannel = guild.systemChannel || 
                guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));

            if (targetChannel) {
                const invite = await targetChannel.createInvite({
                    maxAge: 0, 
                    maxUses: 0, 
                    reason: 'Lunaria Auto ServerInfo Invite Link'
                });
                permanentInviteLink = invite.url;
            }
        } catch (error) {
            console.error('[LUNARIA ERROR] Gagal membuat invite link otomatis:', error);
            permanentInviteLink = "https://discord.gg"; 
        }

        // 2. Mengambil data statistik wilayah secara akurat
        const totalChannels = guild.channels.cache.size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        
        const textChannels = guild.channels.cache.filter(c => 
            c.type === ChannelType.GuildText || 
            c.type === ChannelType.GuildAnnouncement || 
            c.type === ChannelType.GuildForum
        ).size;
        
        const voiceChannels = guild.channels.cache.filter(c => 
            c.type === ChannelType.GuildVoice || 
            c.type === ChannelType.GuildStageVoice
        ).size;

        const bannerURL = guild.bannerURL({ size: 1024 }) || null;

        const sEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: `📋 INFORMASI SERVER`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTitle(`🏰 ${guild.name}`)
            .setDescription(
                `Selamat Datang di **${guild.name}**!\n` +
                `Gunakan tautan di bawah ini untuk mengundang orang lain bergabung:\n` +
                `🔗 **[Klik di Sini untuk Mengundang Teman](${permanentInviteLink})**`
            )
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor('#2F3136')
            .addFields(
                { 
                    name: '🆔 Server ID', 
                    value: `\`${guild.id}\``, 
                    inline: false 
                },
                { 
                    name: '📅 Dibuat Pada', 
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, 
                    inline: true 
                },
                { 
                    name: '👥 Total Anggota', 
                    value: `**${guild.memberCount}** Pengguna`, 
                    inline: true 
                },
                { 
                    name: '💬 Total Channel', 
                    value: `📁 Kategori: **${categories}** | 📝 Teks: **${textChannels}** | 🔊 Voice: **${voiceChannels}**\n*(Total Objek: **${totalChannels}**)*`, 
                    inline: false 
                },
                { 
                    name: '🚀 Server Boost', 
                    value: `✨ Level **${guild.premiumTier}** (${guild.premiumSubscriptionCount || 0} Boosts)`, 
                    inline: false 
                }
            )
            .setTimestamp();

        if (bannerURL) {
            sEmbed.setImage(bannerURL);
        }

        if (context.replied || context.deferred) {
            await context.editReply({ embeds: [sEmbed] });
        } else {
            await context.reply({ embeds: [sEmbed] });
        }
    }
};