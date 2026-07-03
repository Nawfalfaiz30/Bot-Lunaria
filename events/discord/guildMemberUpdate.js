// D:\Lunaria_New 2\events\...\guildMemberUpdate.js
const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSchema');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'guildMemberUpdate',
    once: false,
    async execute(oldMember, newMember, client) {
        // Logika Deteksi Boost: Memastikan perubahannya murni karena melakukan boost server
        const isBoosting = !oldMember.premiumSince && newMember.premiumSince;
        if (!isBoosting) return;

        const user = newMember.user;

        try {
            // 1. Cek pengaturan server di Database
            const guildData = await GuildSettings.findOne({ guildId: newMember.guild.id });
            if (!guildData || !guildData.boostChannel) return;

            // 2. Ambil channel tujuan (Mendukung Fetch jika Cache kosong)
            let channel = newMember.guild.channels.cache.get(guildData.boostChannel);
            if (!channel) {
                channel = await newMember.guild.channels.fetch(guildData.boostChannel).catch(() => null);
            }
            if (!channel) return;

            const boostDescription = `Terima kasih banyak <@${user.id}> telah melakukan **Server Boost** untuk **${newMember.guild.name}**!\nDukunganmu sangat berarti bagi perkembangan komunitas ini. Enjoy your special perks! 🚀`;

            // 3. --- DESAIN EMBED PREMIUM NITRO CARDS ---
            const boostEmbed = new EmbedBuilder()
                .setColor('#ff73fa') // Warna pink neon premium khas Discord Nitro Boost
                .setAuthor({ 
                    name: 'Server Boosted • Dukungan Baru', 
                    iconURL: newMember.guild.iconURL({ dynamic: true }) 
                })
                .setThumbnail('https://cdn.discordapp.com/emojis/994464522930266182.gif') // Icon animasi Nitro Gif bawaanmu
                .setDescription(
                    `╔▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                    `║ 🌟 **SERVER LEVEL UP / BOOSTED!**\n` +
                    `╚▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                    `> ${boostDescription}\n\n` +
                    `**Arsip Donatur Server:**\n` +
                    `• **Donatur:** ${user} \`(${user.id})\`\n` +
                    `• **Status Premium:** Berlangganan sejak <t:${Math.floor(newMember.premiumSinceTimestamp / 1000)}:R>\n` +
                    `• **Total Boost Saat Ini:** \`${newMember.guild.premiumSubscriptionCount || 0}\` Boost`
                )
                .setFooter({ text: `Terima kasih atas kontribusimu, ${user.username}! 💖` })
                .setTimestamp();

            // 4. Kirim ke Discord
            await channel.send({ embeds: [boostEmbed] });

        } catch (error) {
            logger.error(`[BOOST EVENT ERROR] Gagal mendeteksi boost dari: ${user.tag}`, error);
        }
    }
};