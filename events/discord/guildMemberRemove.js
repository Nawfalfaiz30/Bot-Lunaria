// D:\Lunaria_New 2\events\...\guildMemberRemove.js
const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSchema');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member, client) {
        // AMBIL DATA USER (Mendukung parsial jika cache kosong)
        let user = member.user;
        if (member.partial || !user || user.partial) {
            try {
                user = await client.users.fetch(member.id);
            } catch (err) {
                logger.error(`[GOODBYE ERROR] Gagal fetch data user global untuk ID: ${member.id}`, err);
                return;
            }
        }

        // Cek apakah yang keluar merupakan akun BOT atau Manusia
        const isBot = user.bot;

        try {
            // 1. Ambil data database
            const guildData = await GuildSettings.findOne({ guildId: member.guild.id });
            if (!guildData || !guildData.goodbyeChannel) return;

            // 2. Ambil channel tujuan
            let channel = member.guild.channels.cache.get(guildData.goodbyeChannel);
            if (!channel) {
                channel = await member.guild.channels.fetch(guildData.goodbyeChannel).catch(() => null);
            }
            if (!channel) return;

            // 3. Racik format pesan kustom
            let goodbyeDescription = '';
            if (guildData.goodbyeMessage) {
                goodbyeDescription = guildData.goodbyeMessage
                    .replace(/{user}/g, `**${user.username}**`)
                    .replace(/{server}/g, member.guild.name);
            } else {
                goodbyeDescription = isBot 
                    ? `Integrasi bot **${user.username}** telah dihapus/dikeluarkan dari sistem **${member.guild.name}**.`
                    : `**${user.username}** baru saja melangkah keluar dari **${member.guild.name}**. Terima kasih telah mengukir cerita bersama kami! 🍃`;
            }

            // 4. Ambil tanggal pembuatan akun Discord
            const akunDibuat = `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;

            // 5. --- KUSTOMISASI TAMPILAN BERDASARKAN USER / BOT ---
            const embedHeader = isBot ? `║ 🤖 **BOT SYSTEM DEACTIVATED**` : `║ 🥀 **SAYONARA, TRAVELER!**`;
            const embedColor = isBot ? '#eccc68' : '#2b2d31'; // Warna kuning/oranye jika bot, abu-abu gelap jika user
            const identityText = isBot ? `${user} \`[BOT]\` \`(${user.id})\`` : `${user} \`(${user.id})\``;

            // 6. --- DESAIN EMBED MODERN AESTHETIC ---
            const goodbyeEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setAuthor({ 
                    name: isBot ? 'System Log • Bot Removed' : 'Farewell Log • Meninggalkan Server', 
                    iconURL: member.guild.iconURL({ dynamic: true }) 
                })
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setDescription(
                    `╔▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                    `${embedHeader}\n` +
                    `╚▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                    `> ${goodbyeDescription}\n\n` +
                    `**Arsip Jejak Pengguna:**\n` +
                    `• **Identitas:** ${identityText}\n` +
                    `• **Akun Dibuat:** ${akunDibuat}\n` +
                    `• **Sisa Anggota:** \`${member.guild.memberCount}\` pengguna`
                )
                .setFooter({ text: isBot ? `Sistem Integrasi Diperbarui.` : `Sampai jumpa lagi, ${user.username}! ✨` })
                .setTimestamp();

            // 7. Kirim ke Discord
            await channel.send({ embeds: [goodbyeEmbed] });

        } catch (error) {
            logger.error(`[GOODBYE EVENT ERROR] Gagal memproses pesan keluar:`, error);
        }
    }
};