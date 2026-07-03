// D:\Lunaria_New 2\events\...\guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSchema');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        // AMBIL DATA USER (Mendukung partials jika cache discord sedang delay)
        let user = member.user;
        if (member.partial || !user || user.partial) {
            try {
                user = await client.users.fetch(member.id);
            } catch (err) {
                logger.error(`[WELCOME ERROR] Gagal fetch data user global untuk ID: ${member.id}`, err);
                return;
            }
        }

        const isBot = user.bot;

        try {
            // 1. Cek pengaturan server di Database
            const guildData = await GuildSettings.findOne({ guildId: member.guild.id });
            if (!guildData || !guildData.welcomeChannel) return;

            // 2. Ambil channel tujuan (Mendukung Fetch jika Cache kosong)
            let channel = member.guild.channels.cache.get(guildData.welcomeChannel);
            if (!channel) {
                channel = await member.guild.channels.fetch(guildData.welcomeChannel).catch(() => null);
            }
            if (!channel) return;

            // 3. Racik format pesan kustom sambutan
            let welcomeDescription = '';
            if (guildData.welcomeMessage) {
                welcomeDescription = guildData.welcomeMessage
                    .replace(/{user}/g, `<@${user.id}>`)
                    .replace(/{server}/g, member.guild.name);
            } else {
                welcomeDescription = isBot
                    ? `Sistem mendeteksi integrasi bot baru **${user.username}** telah berhasil ditambahkan.`
                    : `Selamat datang di **${member.guild.name}**, ${user}! Semoga betah dan menemukan banyak hal seru di sini! 🎉`;
            }

            // 4. Ambil tanggal pembuatan akun Discord
            const akunDibuat = `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;

            // 5. Kustomisasi Header & Label khusus Bot / Manusia
            const embedHeader = isBot ? `║ 🤖 **NEW BOT INTEGRATED**` : `║ 🎉 **WELCOME TO THE SERVER!**`;
            const identityText = isBot ? `${user} \`[BOT]\` \`(${user.id})\`` : `${user} \`(${user.id})\``;

            // 6. --- DESAIN EMBED MODERN AESTHETIC ---
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // Warna abu-abu gelap sleek (Menyatu sempurna dengan Discord Dark Mode)
                .setAuthor({ 
                    name: isBot ? 'System Log • Bot Added' : 'Welcome Log • Anggota Baru', 
                    iconURL: member.guild.iconURL({ dynamic: true }) 
                })
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setDescription(
                    `╔▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                    `${embedHeader}\n` +
                    `╚▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                    `> ${welcomeDescription}\n\n` +
                    `**Arsip Data Pengguna:**\n` +
                    `• **Identitas:** ${identityText}\n` +
                    `• **Akun Dibuat:** ${akunDibuat}\n` +
                    `• **Total Anggota:** \`${member.guild.memberCount}\` pengguna`
                )
                .setFooter({ text: isBot ? `Sistem Integrasi Berhasil.` : `Selamat menjelajah, ${user.username}! ✨` })
                .setTimestamp();

            // 7. Kirim ke Discord
            await channel.send({ embeds: [welcomeEmbed] });

        } catch (error) {
            logger.error(`[WELCOME EVENT ERROR] Gagal memproses pesan masuk:`, error);
        }
    }
};