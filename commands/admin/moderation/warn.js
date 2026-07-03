const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const WarnDB = require('../../../models/warnSchema');
const GuildSettings = require('../../../models/guildSchema');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');
const security = require('../../../helpers/securityHelper');

module.exports = {
    name: 'warn',
    aliases: ['warnings', 'peringatan', 'cekwarn'],
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Sistem pusat pengelolaan peringatan (Warn) member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        
        // 1. Subcommand: Add (Memberi Warn)
        .addSubcommand(sub => sub.setName('add').setDescription('Memberikan peringatan tertulis kepada member.')
            .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin diberi peringatan').setRequired(true))
            .addStringOption(opt => opt.setName('alasan').setDescription('Alasan pemberian peringatan').setRequired(true))
        )
        // 2. Subcommand: List (Melihat Riwayat Warn)
        .addSubcommand(sub => sub.setName('list').setDescription('Melihat riwayat daftar peringatan seorang member.')
            .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dicek riwayatnya').setRequired(true))
        )
        // 3. Subcommand: Remove (Menghapus Satu Warn)
        .addSubcommand(sub => sub.setName('remove').setDescription('Menghapus SATU peringatan spesifik dari member.')
            .addUserOption(opt => opt.setName('target').setDescription('Member yang dituju').setRequired(true))
            .addIntegerOption(opt => opt.setName('nomor').setDescription('Nomor peringatan (Cek dengan opsi list)').setRequired(true).setMinValue(1))
        )
        // 4. Subcommand: Clear (Reset Semua Warn)
        .addSubcommand(sub => sub.setName('clear').setDescription('Menghapus SELURUH riwayat peringatan dari member.')
            .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dibersihkan nama baiknya').setRequired(true))
        ),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const guildId = context.guild.id;

        // Solusi Warning: Menggunakan MessageFlags.Ephemeral menggantikan ephemeral: true
        const sendResponse = async (options) => {
            if (!isSlash && options.flags) delete options.flags;
            return await context.reply(options);
        };

        // Ambil data pengaturan guild dari MongoDB untuk log channel
        const guildData = await GuildSettings.findOne({ guildId: guildId }) || new GuildSettings({ guildId: guildId });

        // Solusi TypeError: Memastikan client.user diakses dengan aman lewat context.client
        const sendModerationLog = async (title, color, targetInfo, extraFields = []) => {
            if (guildData && guildData.logChannel) {
                const logChan = context.guild.channels.cache.get(guildData.logChannel);
                if (logChan) {
                    const botUser = context.client.user; // Mengambil user bot langsung dari object context
                    const logEmbed = new EmbedBuilder()
                        .setAuthor({ name: context.guild.name, iconURL: context.guild.iconURL({ dynamic: true }) })
                        .setTitle(title)
                        .setThumbnail(botUser.displayAvatarURL({ dynamic: true }))
                        .setColor(color)
                        .addFields(
                            { name: '👤 Target', value: targetInfo, inline: true },
                            { name: '🛡️ Admin/Mod', value: `${author}\n\`${author.username}\``, inline: true },
                            ...extraFields
                        )
                        .setFooter({ text: `${context.guild.name} Warn System` })
                        .setTimestamp();
                    await logChan.send({ embeds: [logEmbed] }).catch(() => null);
                }
            }
        };

        // Proteksi Izin untuk Mode Prefix
        if (!isSlash && !context.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return sendResponse({ embeds: [embed.error(author, 'Akses Ditolak', 'Kamu tidak memiliki izin `Moderate Members` untuk menggunakan perintah ini.')], flags: [MessageFlags.Ephemeral] });
        }

        // Ambil Subcommand untuk Mode Prefix (ln!warn add/list/remove/clear)
        const subCommand = isSlash ? context.options.getSubcommand() : args[0]?.toLowerCase();

        if (!subCommand || !['add', 'list', 'remove', 'clear'].includes(subCommand)) {
            return sendResponse({ content: '❌ **Format Salah!** Gunakan sub-perintah: `add`, `list`, `remove`, atau `clear`.\nContoh: `ln!warn add @user Spamming`', flags: [MessageFlags.Ephemeral] });
        }

        // Tentukan Target Pengguna (Berlaku untuk semua subcommand)
        let targetUser;
        if (isSlash) {
            targetUser = context.options.getUser('target');
        } else {
            targetUser = context.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => null) : null);
        }

        if (!targetUser) {
            return sendResponse({ content: '❌ Tentukan tag member atau ID member yang valid!', flags: [MessageFlags.Ephemeral] });
        }

        try {
            // =========================================================================
            // 🛠️ LOGIKA 1: ADD (Memberi Peringatan Baru)
            // =========================================================================
            if (subCommand === 'add') {
                const reason = isSlash ? context.options.getString('alasan') : args.slice(2).join(' ');
                if (!reason) return sendResponse({ content: '❌ Alasan wajib disertakan!', flags: [MessageFlags.Ephemeral] });

                const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
                if (!targetMember) return sendResponse({ embeds: [embed.error(author, 'Gagal', 'Member tidak ditemukan di server ini.')], flags: [MessageFlags.Ephemeral] });

                const securityContext = isSlash ? context : { guild: context.guild, user: context.author };
                const checkSecurity = security.canPunishMember(securityContext, targetMember);
                if (!checkSecurity.canPunish) return sendResponse({ embeds: [embed.error(author, 'Akses Ditolak', checkSecurity.reason)], flags: [MessageFlags.Ephemeral] });

                let warnData = await WarnDB.findOne({ guildId: guildId, userId: targetUser.id }) || new WarnDB({ guildId: guildId, userId: targetUser.id, warnings: [] });
                
                warnData.warnings.push({ moderatorId: author.id, reason: reason });
                await warnData.save();

                try { await targetUser.send(`⚠️ Kamu telah diberi peringatan di server **${context.guild.name}**.\n**Alasan:** ${reason}`); } catch (e) {}

                // Mengirimkan Premium Log
                await sendModerationLog('⚠️ Peringatan Diberikan (Warn)', '#f1c40f', `${targetUser}\n\`${targetUser.username}\``, [
                    { name: '📊 Total Pelanggaran', value: `Peringatan ke-${warnData.warnings.length}`, inline: true },
                    { name: '📌 Alasan', value: reason, inline: false }
                ]);

                return sendResponse({ embeds: [embed.success(author, '⚠️ Peringatan Diberikan', `**${targetUser.username}** telah berhasil diberi peringatan.\nIni adalah peringatan ke-**${warnData.warnings.length}** untuknya.\n\n📝 **Alasan:** \`${reason}\``)] });
            }

            // =========================================================================
            // 🛠️ LOGIKA 2: LIST (Melihat Riwayat Peringatan)
            // =========================================================================
            if (subCommand === 'list') {
                const warnData = await WarnDB.findOne({ guildId: guildId, userId: targetUser.id });

                if (!warnData || warnData.warnings.length === 0) {
                    return sendResponse({ embeds: [embed.info(author, 'Bersih', `**${targetUser.username}** tidak memiliki riwayat peringatan apa pun di server ini. ✨`)] });
                }

                const warnEmbed = new EmbedBuilder()
                    .setColor('#f39c12')
                    .setTitle(`📋 Riwayat Peringatan: ${targetUser.username}`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setDescription(`Total Peringatan: **${warnData.warnings.length}**\n\n`);

                const recentWarnings = warnData.warnings.slice(-10);
                recentWarnings.forEach((warn, index) => {
                    const date = new Date(warn.timestamp).toLocaleDateString('id-ID');
                    warnEmbed.addFields({ name: `Peringatan #${index + 1} | ${date}`, value: `**Oleh:** <@${warn.moderatorId}>\n**Alasan:** ${warn.reason}` });
                });

                return sendResponse({ embeds: [warnEmbed] });
            }

            // =========================================================================
            // 🛠️ LOGIKA 3: REMOVE (Menghapus Peringatan Spesifik Berdasarkan Nomor)
            // =========================================================================
            if (subCommand === 'remove') {
                const warnNumber = isSlash ? context.options.getInteger('nomor') : parseInt(args[2]);
                if (!warnNumber || isNaN(warnNumber) || warnNumber < 1) return sendResponse({ content: '❌ Masukkan nomor peringatan yang valid (minimal 1)!', flags: [MessageFlags.Ephemeral] });

                const warnData = await WarnDB.findOne({ guildId: guildId, userId: targetUser.id });
                if (!warnData || warnData.warnings.length === 0) return sendResponse({ embeds: [embed.error(author, 'Tidak Ada Data', `**${targetUser.username}** tidak memiliki peringatan.`)] });
                
                if (warnNumber > warnData.warnings.length) return sendResponse({ embeds: [embed.error(author, 'Nomor Tidak Valid', `Member ini hanya memiliki **${warnData.warnings.length}** peringatan.`)], flags: [MessageFlags.Ephemeral] });

                const removedWarn = warnData.warnings[warnNumber - 1];

                warnData.warnings.splice(warnNumber - 1, 1);
                await warnData.save();

                // Mengirimkan Premium Log
                await sendModerationLog('🗑️ Satu Peringatan Dihapus', '#3498db', `${targetUser}\n\`${targetUser.username}\``, [
                    { name: '🔢 Nomor Indeks', value: `#${warnNumber}`, inline: true },
                    { name: '📝 Isi Kasus Lama', value: removedWarn.reason || 'Tidak teridentifikasi', inline: false }
                ]);

                return sendResponse({ embeds: [embed.success(author, '🗑️ Peringatan Dihapus', `Peringatan nomor **${warnNumber}** milik **${targetUser.username}** berhasil dihapus.`)] });
            }

            // =========================================================================
            // 🛠️ LOGIKA 4: CLEAR (Menghapus Seluruh Riwayat Peringatan)
            // =========================================================================
            if (subCommand === 'clear') {
                const deletedData = await WarnDB.findOneAndDelete({ guildId: guildId, userId: targetUser.id });

                if (!deletedData || deletedData.warnings.length === 0) {
                    return sendResponse({ embeds: [embed.info(author, 'Sudah Bersih', `**${targetUser.username}** memang tidak memiliki peringatan apa pun.`)] });
                }

                // Mengirimkan Premium Log
                await sendModerationLog('🧹 Riwayat Peringatan Dihapus Total', '#2ecc71', `${targetUser}\n\`${targetUser.username}\``, [
                    { name: '🗑️ Jumlah Dihapus', value: `${deletedData.warnings.length} Kasus Peringatan`, inline: true }
                ]);

                return sendResponse({ embeds: [embed.success(author, '🧹 Peringatan Dihapus Total', `Seluruh riwayat peringatan (Total: **${deletedData.warnings.length}** peringatan) milik **${targetUser.username}** telah berhasil dihapus.`)] });
            }

        } catch (error) {
            logger.error(`[WARN SYSTEM ERROR] Gagal mengeksekusi sub-perintah ${subCommand}`, error);
            return sendResponse({ embeds: [embed.error(author, 'Error', 'Terjadi kesalahan sistem saat memproses basis data.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};