const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const GuildSettings = require('../../../models/guildSchema');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');
const security = require('../../../helpers/securityHelper');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'user',
    aliases: [
        'ban', 'hammer', 'banned',
        'unban', 'pardonban', 'removeban',
        'softban', 'sb', 'cleanspam',
        'kick', 'k',
        'blacklist', 'bl', 'blockbot',
        'timeout', 'mute', 'bisukan', 'to',
        'untimeout', 'unmute', 'unbisukan',
        'setnick', 'nick', 'nickname', 'ubahganti'
    ],
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Sistem manajemen dan tindakan moderasi personil (User Control).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        
        // Subcommand: Ban
        .addSubcommand(sub =>
            sub.setName('ban')
                .setDescription('Memblokir (Ban) member dari server.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-ban').setRequired(true))
                .addStringOption(opt => opt.setName('alasan').setDescription('Alasan pemblokiran (Opsional)'))
        )
        // Subcommand: Unban
        .addSubcommand(sub =>
            sub.setName('unban')
                .setDescription('Membuka blokir (Unban) member menggunakan ID mereka.')
                .addStringOption(opt => opt.setName('user_id').setDescription('ID pengguna (Contoh: 123456789012345678)').setRequired(true))
                .addStringOption(opt => opt.setName('alasan').setDescription('Alasan pencabutan ban (Opsional)'))
        )
        // Subcommand: Softban
        .addSubcommand(sub =>
            sub.setName('softban')
                .setDescription('Mengeluarkan member sekaligus menghapus pesan spam mereka (7 hari ke belakang).')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-softban').setRequired(true))
                .addStringOption(opt => opt.setName('alasan').setDescription('Alasan softban (Opsional)'))
        )
        // Subcommand: Kick
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Mengeluarkan member dari server.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-kick').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Alasan kick'))
        )
        // Subcommand: Blacklist
        .addSubcommand(sub =>
            sub.setName('blacklist')
                .setDescription('Memasukkan atau mengeluarkan member dari Daftar Hitam bot.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-blacklist / un-blacklist').setRequired(true))
        )
        // Subcommand: Timeout
        .addSubcommand(sub =>
            sub.setName('timeout')
                .setDescription('Membisukan (Timeout) member untuk jangka waktu tertentu.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-timeout').setRequired(true))
                .addIntegerOption(opt => opt.setName('durasi').setDescription('Durasi waktu (angka saja)').setRequired(true).setMinValue(1))
                .addStringOption(opt => opt.setName('satuan').setDescription('Satuan waktu').setRequired(true).addChoices(
                    { name: 'Menit', value: 'm' }, { name: 'Jam', value: 'h' }, { name: 'Hari', value: 'd' }
                ))
                .addStringOption(opt => opt.setName('alasan').setDescription('Alasan timeout (Opsional)'))
        )
        // Subcommand: Untimeout
        .addSubcommand(sub =>
            sub.setName('untimeout')
                .setDescription('Mencabut status timeout dari seorang member lebih awal.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dicabut timeout-nya').setRequired(true))
                .addStringOption(opt => opt.setName('alasan').setDescription('Alasan pencabutan timeout (Opsional)'))
        )
        // Subcommand: Setnick
        .addSubcommand(sub =>
            sub.setName('setnick')
                .setDescription('Mengubah atau mereset nama panggilan (nickname) member.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin diubah namanya').setRequired(true))
                .addStringOption(opt => opt.setName('nama_baru').setDescription('Nama baru (Kosongkan untuk mereset)').setMaxLength(32))
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;
        const guildId = context.guild.id;

        const sendResponse = async (options) => {
            if (!isInteraction && options.flags) delete options.flags;
            return await context.reply(options);
        };

        const guildData = await GuildSettings.findOne({ guildId: guildId }) || new GuildSettings({ guildId: guildId });

        const sendModerationLog = async (title, color, targetInfo, extraFields = []) => {
            if (guildData && guildData.logChannel) {
                const logChan = context.guild.channels.cache.get(guildData.logChannel);
                if (logChan) {
                    const logEmbed = new EmbedBuilder()
                        .setAuthor({ name: context.guild.name, iconURL: context.guild.iconURL({ dynamic: true }) })
                        .setTitle(title)
                        .setThumbnail(context.client.user.displayAvatarURL({ dynamic: true }))
                        .setColor(color)
                        .addFields(
                            { name: '👤 Target', value: targetInfo, inline: true },
                            { name: '🛡️ Admin/Mod', value: `${userExecutor}\n\`${userExecutor.username}\``, inline: true },
                            ...extraFields
                        )
                        .setFooter({ text: `${context.guild.name} Moderation System` })
                        .setTimestamp();
                    await logChan.send({ embeds: [logEmbed] }).catch(() => null);
                }
            }
        };

        // --- DETEKSI SUBCOMMAND (Hybrid Mode) ---
        let subcommand = '';
        if (isInteraction) {
            subcommand = context.options.getSubcommand();
        } else {
            // Deteksi command called murni tanpa prefix
            let commandCalled = context.content.split(' ')[0];
            const prefix = client.prefix || 'lr!';
            if (commandCalled.toLowerCase().startsWith(prefix.toLowerCase())) {
                commandCalled = commandCalled.slice(prefix.length);
            }
            commandCalled = commandCalled.toLowerCase();
            
            if (['ban', 'hammer', 'banned'].includes(commandCalled)) subcommand = 'ban';
            else if (['unban', 'pardonban', 'removeban'].includes(commandCalled)) subcommand = 'unban';
            else if (['softban', 'sb', 'cleanspam'].includes(commandCalled)) subcommand = 'softban';
            else if (['kick', 'k'].includes(commandCalled)) subcommand = 'kick';
            else if (['blacklist', 'bl', 'blockbot'].includes(commandCalled)) subcommand = 'blacklist';
            else if (['timeout', 'mute', 'bisukan', 'to'].includes(commandCalled)) subcommand = 'timeout';
            else if (['untimeout', 'unmute', 'unbisukan'].includes(commandCalled)) subcommand = 'untimeout';
            else if (['setnick', 'nick', 'nickname', 'ubahganti'].includes(commandCalled)) subcommand = 'setnick';
            else if (commandCalled === 'user' && args[0]) {
                const subArg = args.shift().toLowerCase();
                if (['ban', 'hammer', 'banned'].includes(subArg)) subcommand = 'ban';
                else if (['unban', 'pardonban', 'removeban'].includes(subArg)) subcommand = 'unban';
                else if (['softban', 'sb', 'cleanspam'].includes(subArg)) subcommand = 'softban';
                else if (['kick', 'k'].includes(subArg)) subcommand = 'kick';
                else if (['blacklist', 'bl', 'blockbot'].includes(subArg)) subcommand = 'blacklist';
                else if (['timeout', 'mute', 'bisukan', 'to'].includes(subArg)) subcommand = 'timeout';
                else if (['untimeout', 'unmute', 'unbisukan'].includes(subArg)) subcommand = 'untimeout';
                else if (['setnick', 'nick', 'nickname', 'ubahganti'].includes(subArg)) subcommand = 'setnick';
                else subcommand = subArg;
            } else {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Subcommand tidak valid atau tidak ditemukan.')] });
            }
        }

        // --- PENGECEKAN HAK AKSES PERMISSION (Mode Prefix) ---
        if (!isInteraction) {
            let reqPerm = null;
            let permName = '';

            if (['ban', 'unban', 'softban'].includes(subcommand)) { reqPerm = PermissionFlagsBits.BanMembers; permName = 'Ban Members'; }
            else if (subcommand === 'kick') { reqPerm = PermissionFlagsBits.KickMembers; permName = 'Kick Members'; }
            else if (subcommand === 'blacklist') { reqPerm = PermissionFlagsBits.Administrator; permName = 'Administrator'; }
            else if (['timeout', 'untimeout'].includes(subcommand)) { reqPerm = PermissionFlagsBits.ModerateMembers; permName = 'Moderate Members'; }
            else if (subcommand === 'setnick') { reqPerm = PermissionFlagsBits.ManageNicknames; permName = 'Manage Nicknames'; }

            if (reqPerm && !context.member.permissions.has(reqPerm)) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', `Kamu tidak memiliki izin \`${permName}\` untuk perintah ini.`)] });
            }
        }

        // ==========================================
        // EKSEKUSI OPERASI BERDASARKAN SUBCOMMAND
        // ==========================================

        // --- CASE 1 & 3 & 4: BAN, SOFTBAN, KICK ---
        if (['ban', 'softban', 'kick'].includes(subcommand)) {
            let targetUser, reason;
            if (isInteraction) {
                targetUser = context.options.getUser('target');
                reason = context.options.getString(subcommand === 'kick' ? 'reason' : 'alasan') || 'Tidak ada alasan.';
            } else {
                targetUser = context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
                reason = args && args.slice(1).join(' ') ? args.slice(1).join(' ') : 'Tidak ada alasan.';
            }

            if (!targetUser) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', `Format salah! Gunakan: \`${client.prefix || 'lr!'}${subcommand} [@user/ID] [alasan]\``)], flags: [MessageFlags.Ephemeral] });
            
            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan di server ini.')], flags: [MessageFlags.Ephemeral] });

            if (subcommand === 'kick') {
                if (!targetMember.kickable) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Saya tidak memiliki izin untuk mengeluarkan member ini (posisi role lebih tinggi/sama).')], flags: [MessageFlags.Ephemeral] });
            } else {
                const secContext = isInteraction ? context : { guild: context.guild, user: context.author };
                const checkSec = security.canPunishMember(secContext, targetMember);
                if (!checkSec.canPunish) return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', checkSec.reason)], flags: [MessageFlags.Ephemeral] });
            }

            try {
                if (subcommand === 'ban') {
                    try { await targetUser.send(`🔨 Kamu telah di-ban dari **${context.guild.name}**.\n**Alasan:** ${reason}`); } catch (e) {}
                    await targetMember.ban({ reason: `Di-ban oleh ${userExecutor.tag} | Alasan: ${reason}` });
                    
                    await sendModerationLog('🔨 Member Berhasil Di-ban', '#e74c3c', `${targetUser}\n\`${targetUser.username}\``, [{ name: '📌 Alasan', value: reason, inline: false }]);
                    return await sendResponse({ embeds: [embed.success(userExecutor, '🔨 Member Di-ban', `**${targetUser.username}** telah berhasil diblokir dari server.\n\n**Alasan:** \`${reason}\``)] });
                } 
                else if (subcommand === 'softban') {
                    try { await targetUser.send(`🌪️ Kamu telah di-softban dari **${context.guild.name}**.\n**Alasan:** ${reason}`); } catch (e) {}
                    await targetMember.ban({ deleteMessageSeconds: 604800, reason: `Softban oleh ${userExecutor.tag} | Alasan: ${reason}` });
                    await context.guild.members.unban(targetUser.id, 'Pencabutan Softban otomatis');
                    
                    await sendModerationLog('🌪️ Member Berhasil Di-softban', '#9b59b6', `${targetUser}\n\`${targetUser.username}\``, [{ name: '📌 Alasan', value: reason, inline: false }]);
                    return await sendResponse({ embeds: [embed.success(userExecutor, '🌪️ Member Di-softban', `**${targetUser.username}** telah berhasil di-softban dan pesannya dibersihkan.\n\n**Alasan:** \`${reason}\``)] });
                } 
                else if (subcommand === 'kick') {
                    await targetMember.kick(reason);
                    
                    await sendModerationLog('👢 Member Berhasil Di-kick', '#e67e22', `${targetUser}\n\`${targetUser.username}\``, [{ name: '📌 Alasan', value: reason, inline: false }]);
                    const successEmbed = new EmbedBuilder().setTitle('✅ Member Di-kick').setColor('#e67e22').setDescription(`**${targetUser.username}** telah dikeluarkan.`).addFields({ name: 'Alasan', value: reason }).setTimestamp();
                    return await context.reply({ embeds: [successEmbed] });
                }
            } catch (err) {
                logger.error(`[MODERATION ERROR - ${subcommand.toUpperCase()}]`, err);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan sistem saat memproses tindakan.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 2: UNBAN ---
        if (subcommand === 'unban') {
            const userId = isInteraction ? context.options.getString('user_id') : (args && args[0] ? args[0] : null);
            const reason = isInteraction ? (context.options.getString('alasan') || 'Tidak ada alasan.') : (args && args.slice(1).join(' ') ? args.slice(1).join(' ') : 'Tidak ada alasan.');

            if (!userId) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Tentukan ID user! Format: `!unban [ID] [alasan]`')], flags: [MessageFlags.Ephemeral] });

            try {
                await context.guild.members.unban(userId, `Di-unban oleh ${userExecutor.tag} | Alasan: ${reason}`);
                await sendModerationLog('🔓 Blokir Member Dicabut (Unban)', '#2ecc71', `<@${userId}>\n\`ID: ${userId}\``, [{ name: '📌 Alasan', value: reason, inline: false }]);
                return await sendResponse({ embeds: [embed.success(userExecutor, '🔓 Member Di-unban', `ID **${userId}** telah berhasil dibuka blokirnya.\n\n**Alasan:** \`${reason}\``)] });
            } catch (error) {
                logger.error(`[UNBAN ERROR]`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Unban', 'Pastikan ID benar and user tersebut sedang dalam status ban.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 5: BLACKLIST ---
        if (subcommand === 'blacklist') {
            let targetUser = isInteraction ? context.options.getUser('target') : (context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null));

            if (!targetUser) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Tentukan member! Format: `!blacklist [@user/ID]`')], flags: [MessageFlags.Ephemeral] });
            if (targetUser.id === userExecutor.id) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Kamu tidak bisa mem-blacklist dirimu sendiri.')], flags: [MessageFlags.Ephemeral] });
            if (targetUser.id === client.user.id) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Aku tidak bisa mem-blacklist diriku sendiri.')], flags: [MessageFlags.Ephemeral] });

            try {
                if (!guildData.blacklistedUsers) guildData.blacklistedUsers = [];

                const isBlacklisted = guildData.blacklistedUsers.includes(targetUser.id);
                let actionText = '';
                let logTitle = '';
                let logColor = '';

                if (isBlacklisted) {
                    guildData.blacklistedUsers = guildData.blacklistedUsers.filter(id => id !== targetUser.id);
                    actionText = `🔓 **${targetUser.username}** telah dihapus dari daftar hitam bot.`;
                    logTitle = '🔓 User Dihapus dari Blacklist Bot';
                    logColor = '#2ecc71';
                } else {
                    guildData.blacklistedUsers.push(targetUser.id);
                    actionText = `🚫 **${targetUser.username}** dimasukkan ke daftar hitam bot di server ini.`;
                    logTitle = '🚫 User Dimasukkan ke Blacklist Bot';
                    logColor = '#34495e';
                }

                await guildData.save();
                await sendModerationLog(logTitle, logColor, `${targetUser}\n\`${targetUser.username}\``, [{ name: '📌 Keterangan', value: actionText, inline: false }]);
                return await sendResponse({ embeds: [embed.success(userExecutor, 'Status Blacklist Diperbarui', actionText)] });
            } catch (error) {
                logger.error(`[BLACKLIST ERROR]`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal memproses ke database.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 6: TIMEOUT (MUTE) ---
        if (subcommand === 'timeout') {
            let targetUser, durasiAngka, satuan, reason;
            if (isInteraction) {
                targetUser = context.options.getUser('target');
                durasiAngka = context.options.getInteger('durasi');
                satuan = context.options.getString('satuan');
                reason = context.options.getString('alasan') || 'Tidak ada alasan.';
            } else {
                targetUser = context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
                
                // Parsing Khusus untuk Perintah Teks agar format penulisan wajib menyertakan Durasi & Satuan
                durasiAngka = args && args[1] ? parseInt(args[1]) : null;
                satuan = args && args[2] ? args[2].toLowerCase() : null;
                reason = args && args.slice(3).join(' ') ? args.slice(3).join(' ') : 'Tidak ada alasan.';
            }

            // Validasi Input Teks: Jika format durasi/satuan salah, tampilkan pesan petunjuk alih-alih error crash
            if (!targetUser || !durasiAngka || isNaN(durasiAngka) || durasiAngka < 1 || !satuan || !['m', 'h', 'd'].includes(satuan)) {
                return sendResponse({ 
                    embeds: [embed.error(userExecutor, 'Format Salah', `Gunakan format:\n\`${client.prefix || 'lr!'}mute [@user] [angka_durasi] [m/h/d] [alasan]\`\n\n*Contoh: \`${client.prefix || 'lr!'}mute @Forcs 5 m spamm\`*`)] 
                });
            }

            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan.')], flags: [MessageFlags.Ephemeral] });

            const secContext = isInteraction ? context : { guild: context.guild, user: context.author };
            const checkSec = security.canPunishMember(secContext, targetMember);
            if (!checkSec.canPunish) return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', checkSec.reason)], flags: [MessageFlags.Ephemeral] });

            let waktuMs = durasiAngka * 60 * 1000 * (satuan === 'm' ? 1 : satuan === 'h' ? 60 : 60 * 24);
            if (waktuMs > 28 * 24 * 60 * 60 * 1000) return sendResponse({ embeds: [embed.error(userExecutor, 'Durasi Terlalu Lama', 'Maksimal timeout dari Discord adalah 28 hari.')], flags: [MessageFlags.Ephemeral] });

            try {
                await targetMember.timeout(waktuMs, `Timeout oleh ${userExecutor.tag} | Alasan: ${reason}`);
                const namaSatuan = satuan === 'm' ? 'Menit' : satuan === 'h' ? 'Jam' : 'Hari';

                await sendModerationLog('⏱️ Member Di-timeout (Mute)', '#3498db', `${targetUser}\n\`${targetUser.username}\``, [
                    { name: '⏳ Durasi', value: `${durasiAngka} ${namaSatuan}`, inline: true },
                    { name: '📌 Alasan', value: reason, inline: false }
                ]);
                return await sendResponse({ embeds: [embed.success(userExecutor, '⏱️ Member Di-timeout', `**${targetUser.username}** dibisukan selama **${durasiAngka} ${namaSatuan}**.\n📝 **Alasan:** \`${reason}\``)] });
            } catch (error) {
                logger.error(`[TIMEOUT ERROR]`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal melakukan timeout. Cek izin bot.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 7: UNTIMEOUT ---
        if (subcommand === 'untimeout') {
            let targetUser = isInteraction ? context.options.getUser('target') : (context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null));
            const reason = isInteraction ? (context.options.getString('alasan') || 'Tidak ada alasan.') : (args && args.slice(1).join(' ') ? args.slice(1).join(' ') : 'Tidak ada alasan.');

            if (!targetUser) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Tentukan target! Format: `!untimeout [@user]`')], flags: [MessageFlags.Ephemeral] });

            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan.')], flags: [MessageFlags.Ephemeral] });

            if (!targetMember.isCommunicationDisabled()) return sendResponse({ embeds: [embed.error(userExecutor, 'Tidak Valid', `**${targetUser.username}** tidak dalam status timeout.`)], flags: [MessageFlags.Ephemeral] });

            try {
                await targetMember.timeout(null, `Untimeout oleh ${userExecutor.tag} | Alasan: ${reason}`);
                await sendModerationLog('🔊 Status Timeout Dicabut', '#2ecc71', `${targetUser}\n\`${targetUser.username}\``, [{ name: '📌 Alasan', value: reason, inline: false }]);
                return await sendResponse({ embeds: [embed.success(userExecutor, '🔊 Timeout Dicabut', `Status timeout milik **${targetUser.username}** berhasil dicabut.\n\n📝 **Alasan:** \`${reason}\``)] });
            } catch (error) {
                logger.error(`[UNTIMEOUT ERROR]`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mencabut timeout.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 8: SETNICK ---
        if (subcommand === 'setnick') {
            let targetUser, newNick;
            if (isInteraction) {
                targetUser = context.options.getUser('target');
                newNick = context.options.getString('nama_baru') || '';
            } else {
                targetUser = context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
                newNick = args && args.slice(1).join(' ') ? args.slice(1).join(' ') : '';
            }

            if (!targetUser) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Format salah! Gunakan: `!setnick [@user] [nama_baru]`')], flags: [MessageFlags.Ephemeral] });
            if (newNick.length > 32) return sendResponse({ embeds: [embed.error(userExecutor, 'Nama Terlalu Panjang', 'Maksimal panjang 32 karakter.')], flags: [MessageFlags.Ephemeral] });

            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan.')], flags: [MessageFlags.Ephemeral] });

            if (targetMember.roles.highest.position >= context.guild.members.me.roles.highest.position) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', 'Aku tidak bisa mengubah nama member ini karena role-nya lebih tinggi atau setara denganku.')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                const oldNick = targetMember.displayName;
                await targetMember.setNickname(newNick !== '' ? newNick : null, `Diubah oleh ${userExecutor.tag}`);
                const msg = newNick === '' ? `Nama panggilan **${targetUser.username}** telah dikembalikan ke nama aslinya.` : `Nama panggilan **${targetUser.username}** diubah menjadi **${newNick}**.`;
                
                await sendModerationLog(newNick === '' ? '🔄 Nama Panggilan Direset' : '✍️ Nama Panggilan Diubah', '#f1c40f', `${targetUser}\n\`${targetUser.username}\``, [
                    { name: '📝 Sebelum', value: oldNick, inline: true },
                    { name: '✨ Sesudah', value: newNick !== '' ? newNick : 'Nama Asli Akun', inline: true }
                ]);
                return await sendResponse({ embeds: [embed.success(userExecutor, newNick === '' ? 'Nama Direset' : 'Nama Diubah', msg)] });
            } catch (error) {
                logger.error(`[SETNICK ERROR]`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mengubah nama panggilan.')], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};