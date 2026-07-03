// D:\Lunaria_New 2\events\discord\messageDelete.js
const { Events, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSchema');
const SecurityDB = require('../../models/securitySchema');
const logger = require('../../helpers/logger');

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message, client) {
        // Safe Guard: Abaikan jika pesan tidak masuk cache bot (partial) agar tidak memicu crash
        if (message.partial) return;

        // Abaikan jika kejadian di luar server (DM) atau pesan ditulis oleh bot lain
        if (!message.guild || message.author?.bot) return;

        const guildId = message.guild.id;

        // 1. PERIKSA UNSUR TAG: Ambil status mention dari objek pesan
        const containsUserMention = message.mentions.users.size > 0;
        const containsRoleMention = message.mentions.roles.size > 0;
        const containsEveryone = message.mentions.everyone;

        // KHUSUS TAG: Jika pesan yang dihapus TIDAK mengandung tag sama sekali, langsung stop di sini
        if (!containsUserMention && !containsRoleMention && !containsEveryone) return;

        try {
            // 2. VALIDASI KEAMANAN: Periksa apakah fitur Ghost Ping dinyalakan di server ini
            const securityData = await SecurityDB.findOne({ guildId: guildId });
            if (!securityData || !securityData.ghostPingProtection) return;

            // Toleransi: Jika pengguna hanya menge-tag dirinya sendiri lalu dihapus, abaikan
            if (containsUserMention && message.mentions.users.size === 1 && message.mentions.users.has(message.author.id)) {
                return;
            }

            // 3. SUSUN EMBED: Bangun visualisasi kartu bukti Ghost Ping
            const ghostEmbed = new EmbedBuilder()
                .setAuthor({ name: `👻 DETEKSI GHOST PING`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(`### ⚠️ Seseorang melakukan tag member lalu menghapusnya!`)
                .setColor('#ff9f43') // Warna Kuning/Oranye Peringatan
                .addFields(
                    { name: '👤 Identitas Pelaku', value: `${message.author} (\`${message.author.tag}\`)`, inline: true },
                    { name: '📺 Saluran Teks', value: `${message.channel}`, inline: true },
                    { name: '💬 Isi Pesan Yang Dihapus', value: message.content || '*[Pesan berupa gambar/file/kosong]*', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistem Detektor Kebocoran Chat Lunaria' });

            // 4. FIX UTAMA: Kirim HANYA ke channel log server (Tanpa teks headline dan tanpa kirim ke channel publik)
            const guildData = await GuildSettings.findOne({ guildId: guildId });
            if (guildData && guildData.logChannel) {
                const logChannel = message.guild.channels.cache.get(guildData.logChannel);
                
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({
                        embeds: [ghostEmbed]
                    }).catch(() => null);
                }
            }

        } catch (error) {
            logger.error(`[GHOSTPING ERROR] Gagal mengeksekusi filter deteksi khusus tag di server ${guildId}:`, error);
        }
    }
};