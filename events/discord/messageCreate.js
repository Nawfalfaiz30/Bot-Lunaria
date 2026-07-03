// D:\Lunaria_New 2\events\discord\messageCreate.js
const { EmbedBuilder, PermissionFlagsBits, Events } = require('discord.js');
const { prefix: defaultPrefix } = require('../../config');
const GuildSettings = require('../../models/guildSchema');
const SecurityDB = require('../../models/securitySchema'); 
const Profile = require('../../models/profileSchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        // Safe Guard: Abaikan bot, pesan tanpa guild, atau pesan tanpa konten tekstual
        if (!message || message.author?.bot || !message.guild || !message.content) return;

        const guildId = message.guild.id;

        // Ambil data security dan data guild di awal untuk memangkas beban kueri MongoDB
        let securityData = null;
        let guildData = null;
        try {
            securityData = await SecurityDB.findOne({ guildId: guildId });
            guildData = await GuildSettings.findOne({ guildId: guildId });
        } catch (dbError) {
            logger.error(`[DB ERROR] Gagal memuat data konfigurasi di messageCreate:`, dbError);
        }

        // Jalankan pengecekan hak staf (Admin & Moderator kebal dari filter keamanan)
        const isStaff = message.member?.permissions.has(PermissionFlagsBits.ManageMessages) || 
                        message.member?.permissions.has(PermissionFlagsBits.Administrator);

        if (!isStaff && securityData) {
            // =================================================================
            // 🛡️ ENGINE 1: AUTOMODERATOR (FILTER KATA KASAR)
            // =================================================================
            if (securityData.autoMod && securityData.badwords.length > 0) {
                const pesanUserLower = message.content.toLowerCase();
                const terdeteksiBadword = securityData.badwords.some(kata => pesanUserLower.includes(kata.toLowerCase()));

                if (terdeteksiBadword) {
                    await message.delete().catch(() => null);
                    const warning = await message.channel.send(`⚠️ <@${message.author.id}>, pesanmu dihapus otomatis karena mengandung kata terlarang!`);
                    setTimeout(() => warning.delete().catch(() => null), 3000);
                    return; 
                }
            }

            // =================================================================
            // 🛡️ ENGINE 1.5: ANTI-LINK PROTECTION (SISTEM DOMAIN BLACKLIST)
            // =================================================================
            if (securityData.antiLink) {
                const pesanUserLower = message.content.toLowerCase();

                // 🚫 DAFTAR HITAM (BLACKLIST): Tautan yang dilarang keras dikirim oleh member biasa
                const daftarLinkTerlarang = [
                    'discord.gg/',          // Undangan server Discord (Paling Sering buat Iklan)
                    'discord.com/invite/',  // Undangan server Discord versi panjang
                    'discordapp.com/invite/',
                    'discord.me/',
                    'discord.io/',
                    'bit.ly/',              // Pemendek URL (Sering menyembunyikan link phising)
                    'tinyurl.com/',
                    'cutt.ly/',
                    'linktr.ee/'            // Sering dipakai untuk menumpuk link promosi/iklan
                ];

                // Periksa apakah isi chat mengandung salah satu dari kata kunci blacklist di atas
                const terdeteksiBlacklist = daftarLinkTerlarang.some(domain => pesanUserLower.includes(domain));

                if (terdeteksiBlacklist) {
                    // 1. Musnahkan tautan promosi/iklan secara instan
                    await message.delete().catch(() => null);

                    // 2. Kirim peringatan sementara kepada pelanggar di channel publik
                    const linkWarning = await message.channel.send(`🚫 <@${message.author.id}>, dilarang mengirimkan tautan undangan server atau pemendek URL di server ini!`);
                    setTimeout(() => linkWarning.delete().catch(() => null), 4000);

                    // 3. Kirim barang bukti lengkap ke channel log internal staf
                    if (guildData && guildData.logChannel) {
                        const logChannel = message.guild.channels.cache.get(guildData.logChannel);
                        
                        if (logChannel && logChannel.isTextBased()) {
                            const linkLogEmbed = new EmbedBuilder()
                                .setAuthor({ name: `🛡️ FILTER SECURITY: ANTI-LINK`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                                .setDescription(`### ⚠️ Tautan Iklan Terdeteksi & Dimusnahkan!`)
                                .setColor('#ef233c') 
                                .addFields(
                                    { name: '👤 Pelanggar', value: `${message.author} (\`${message.author.tag}\`)`, inline: true },
                                    { name: '📺 Saluran Teks', value: `${message.channel}`, inline: true },
                                    { name: '💬 Konten Pesan Terlarang', value: `\`\`\`text\n${message.content}\`\`\``, inline: false }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Lunaria Anti-Link Blacklist Core' });

                            await logChannel.send({ embeds: [linkLogEmbed] }).catch(() => null);
                        }
                    }
                    return; // Hentikan alur proses seutuhnya
                }
            }
        }

        // =================================================================
        // 🛠️ LOGIKA PENCABUTAN AFK & RINGKASAN PREMIUM
        // =================================================================
        try {
            const authorData = await Profile.findOne({ userId: message.author.id });
            
            if (authorData && authorData.afk && authorData.afk.isAfk) {
                const { reason, timestamp, mentions } = authorData.afk;
                
                const diffMs = Date.now() - timestamp;
                const totalSecs = Math.floor(diffMs / 1000);
                const days = Math.floor(totalSecs / 86400);
                const hours = Math.floor((totalSecs % 86400) / 3600);
                const minutes = Math.floor((totalSecs % 3600) / 60);
                const seconds = totalSecs % 60;

                let durasiStr = '';
                if (days > 0) durasiStr += `\`${days}\` hari `;
                if (hours > 0) durasiStr += `\`${hours}\` jam `;
                if (minutes > 0) durasiStr += `\`${minutes}\` menit `;
                if (seconds > 0 || durasiStr === '') durasiStr += `\`${seconds}\` detik`;
                durasiStr = durasiStr.trim();

                let mentionList = '';
                if (mentions && mentions.length > 0) {
                    const recentMentions = mentions.slice(-6);
                    mentionList = recentMentions.map((m, index) => {
                        const cleanContent = m.content.length > 60 ? m.content.substring(0, 57) + '...' : m.content;
                        return `\`[${index + 1}]\` <@${m.userId}> di <#${m.channelId}>\n└─ *"${cleanContent}"*`;
                    }).join('\n');
                } else {
                    mentionList = '*Tidak ada panggilan masuk selama Anda tidak aktif.*';
                }

                const backEmbed = new EmbedBuilder()
                    .setColor('#43b581') 
                    .setAuthor({ name: 'User Network Status Workspace', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTitle('⚡ STATUS: BACK ONLINE')
                    .setDescription(`Selamat datang kembali! Mode penundaan aktivitas untuk ${message.author} resmi dinonaktifkan.`)
                    .addFields(
                        { name: '📝 Alasan Pergi', value: `\`${reason || 'Tidak ada alasan'}\``, inline: true },
                        { name: '⏳ Total Durasi', value: durasiStr || '\`0 detik\`', inline: true },
                        { name: '📥 Arsip Panggilan Masuk', value: mentionList, inline: false }
                    )
                    .setTimestamp();

                authorData.afk.isAfk = false;
                authorData.afk.mentions = [];
                await authorData.save();

                await message.reply({ embeds: [backEmbed] });
            }
        } catch (afkBackError) {
            logger.error(`[AFK BACK ERROR] Gagal memulihkan status`, afkBackError);
        }

        // =================================================================
        // 🕵️ DETEKSI PENGGUNA AFK (LOG ANTAR MENTION)
        // =================================================================
        if (message.mentions.users.size > 0) {
            for (const mentionedUser of message.mentions.users.values()) {
                if (mentionedUser.id === message.author.id) continue;

                try {
                    const targetData = await Profile.findOne({ userId: mentionedUser.id });
                    
                    if (targetData && targetData.afk && targetData.afk.isAfk) {
                        const alertEmbed = new EmbedBuilder()
                            .setColor('#f04747') 
                            .setAuthor({ name: `${mentionedUser.username} Sedang Tidak Aktif`, iconURL: mentionedUser.displayAvatarURL({ dynamic: true }) })
                            .setTitle('💤 USER IS CURRENTLY AWAY')
                            .setDescription(`Pengguna yang Anda panggil saat ini sedang tidak berada di tempat.`)
                            .addFields(
                                { name: '💬 Alasan Pergi', value: `\`${targetData.afk.reason || 'Tidak ada alasan'}\``, inline: true },
                                { name: '⏰ Waktu Mulai', value: `<t:${Math.floor(targetData.afk.timestamp / 1000)}:R>`, inline: true }
                            )
                            .setFooter({ text: 'Pesan obrolan Anda telah diarsipkan otomatis ke papan lognya.' });

                        await message.reply({ embeds: [alertEmbed] });

                        targetData.afk.mentions.push({
                            userId: message.author.id,
                            channelId: message.channel.id,
                            content: message.content,
                            timestamp: Date.now()
                        });
                        await targetData.save();
                    }
                } catch (afkMentionError) {
                    logger.error(`[AFK MENTION ERROR] Gagal mendata log tag`, afkMentionError);
                }
            }
        }

        // =================================================================
        // PREFIX & COMMAND RESOLUTION ENGINE (SAFE-GUARDED)
        // =================================================================
        let prefix = defaultPrefix || 'lr!';
        if (guildData && guildData.prefix) prefix = guildData.prefix;

        // Proteksi Ruang Saluran Sistem Confess
        if (guildData && guildData.confessChannel) {
            if (message.channel.id === guildData.confessChannel) {
                if (message.channel.isThread()) return;
                return await message.delete().catch(() => null);
            }

            if (message.channel.isThread() && message.channel.parentId === guildData.confessChannel) {
                const messageContentLower = message.content?.toLowerCase() || '';
                const prefixLower = prefix?.toLowerCase() || '';
                if (prefixLower && messageContentLower.startsWith(prefixLower)) {
                    await message.delete().catch(() => null);
                    return;
                }
            }
        }

        const messageContentLower = message.content?.toLowerCase() || '';
        const prefixLower = prefix?.toLowerCase() || '';
        if (!prefixLower || !messageContentLower.startsWith(prefixLower)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const firstArg = args.shift();
        if (!firstArg) return; 
        
        const commandName = firstArg.toLowerCase();

        let command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
        if (!command) return;

        try {
            await command.execute(message, args, client);
        } catch (error) {
            logger.error(`[COMMAND ERROR] ${commandName}:`, error);
            message.reply({ 
                embeds: [embed.error(message.author, 'Terjadi Kesalahan', 'Sistem internal mengalami kendala saat memproses eksekusi perintah ini.')] 
            });
        }
    }
};