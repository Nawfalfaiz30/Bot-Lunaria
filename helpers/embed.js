// Jalur File: D:\Lunaria_New 2\helpers\embed.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
    /**
     * Embed Sukses (Warna Hijau)
     * Digunakan saat aksi berhasil (misal: berhasil membeli item, berhasil transfer koin).
     */
    success: (user, title, description) => {
        return new EmbedBuilder()
            .setColor('#2ecc71') // Hijau Emerald
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp();
    },

    /**
     * Embed Error (Warna Merah)
     * Digunakan saat terjadi kesalahan (misal: koin tidak cukup, tidak punya izin).
     */
    error: (user, title, description) => {
        return new EmbedBuilder()
            .setColor('#e74c3c') // Merah Alizarin
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp();
    },

    /**
     * Embed Informasi (Warna Biru)
     * Digunakan untuk info netral (misal: menampilkan profil user, menampilkan panduan).
     */
    info: (user, title, description) => {
        return new EmbedBuilder()
            .setColor('#3498db') // Biru Peter River
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp();
    },

    /**
     * Embed Log Moderasi Khusus (Wajib ada foto Moderator & Target)
     * Digunakan oleh Staf/Admin untuk mencatat aksi disiplin.
     */
    moderationLog: (moderator, target, action, reason) => {
        return new EmbedBuilder()
            .setColor('#f1c40f') // Kuning Peringatan
            .setAuthor({ name: `Moderation Action: ${action}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🛡️ Moderator', value: `${moderator.username} (\`${moderator.id}\`)`, inline: true },
                { name: '👤 Target', value: `${target.username} (\`${target.id}\`)`, inline: true },
                { name: '📄 Alasan', value: reason || 'Tidak ada alasan yang diberikan.', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Sistem Keamanan Lunaria` });
    },

    /**
     * Embed Universal RPG (Sesuai Struktur Awal dengan Peningkatan Estetika)
     * Digunakan untuk notifikasi umum bertema RPG Lunaria.
     */
    rpg: (user, title, description, color = '#9b59b6', thumbnail = null) => {
        const embed = new EmbedBuilder()
            .setColor(color) // Default: Ungu Amethyst
            .setAuthor({ name: `RPG System | ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`⚔️ ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Dunia Fantasi Lunaria RPG' });
        
        if (thumbnail) {
            embed.setThumbnail(thumbnail);
        }
        
        return embed;
    },

    // =================================================================
    // 🌟 SUB-ENGINE: SPESIALISASI TEMATIK RPG LUNARIA (NEW EXTENSIONS)
    // =================================================================

    /**
     * Embed Khusus Gathering (Mancing, Nambang, Tebang Kayu)
     * Memberikan aksen warna Teal/Hijau Alam khas eksplorasi luar ruangan.
     */
    rpgGathering: (user, activityName, areaNumber, description, thumbnail = null) => {
        const embed = new EmbedBuilder()
            .setColor('#1abc9c') // Aksen Warna Turquoise/Teal
            .setAuthor({ name: `${user.username} sedang bekerja...`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`⛏️ Lunaria Woodwork & Mining Workspace`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: `Gathering System • Area ${areaNumber} • Lunaria Core` });

        if (thumbnail) embed.setThumbnail(thumbnail);
        return embed;
    },

    /**
     * Embed Khusus Pertempuran (Hunt Monster & Boss Dungeon)
     * Memberikan aksen warna Merah Crimson gelap/Emas untuk memicu adrenalin pertempuran.
     */
    rpgCombat: (user, title, description, isVictory = true, areaNumber = 1) => {
        return new EmbedBuilder()
            .setColor(isVictory ? '#27ae60' : '#c0392b') // Hijau gelap jika menang, Merah tua jika tumbang
            .setAuthor({ name: `Laporan Pertempuran: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(isVictory ? `👑 KEMENANGAN: ${title}` : `💀 KEKALAHAN: ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: `Combat Engine • Wilayah Area ${areaNumber} • Lunaria RPG` });
    },

    /**
     * Embed Khusus Ekonomi (Pasar, Toko, Beli & Jual Item)
     * Memberikan aksen warna Emas/Orange niaga yang kontras.
     */
    rpgEconomy: (user, actionTitle, currentGold, description) => {
        return new EmbedBuilder()
            .setColor('#f39c12') // Aksen Warna Emas Pekat
            .setAuthor({ name: `Pasar Raya Lunaria • ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`🛒 Transaksi: ${actionTitle}`)
            .setDescription(description)
            .addFields({ name: '💳 Dompet Saat Ini', value: `💰 \`${currentGold.toLocaleString('id-ID')}\` Emas` })
            .setTimestamp()
            .setFooter({ text: 'Lunaria Trade & Commercial Hub' });
    },

    /**
     * Embed Spesial Peristiwa Agung (Level Up & Time Travel)
     * Memberikan aksen ungu kosmik bercahaya tinggi untuk selebrasi pencapaian pemain.
     */
    rpgCelebration: (user, eventTitle, description, thumbnail = null) => {
        const embed = new EmbedBuilder()
            .setColor('#9b59b6') // Ungu Amethyst Kosmik
            .setAuthor({ name: `PENCAPAIAN AGUNG ANGGOTA`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`🎉 ${eventTitle}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Siklus Takdir Dunia Lunaria' });

        if (thumbnail) embed.setThumbnail(thumbnail);
        return embed;
    }
};