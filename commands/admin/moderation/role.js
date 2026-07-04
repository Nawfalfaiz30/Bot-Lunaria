const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const GuildSettings = require('../../../models/guildSchema');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Pemetaan seluruh alias ke subcommand inti secara akurat
const aliasMap = {
    'add': 'add', 'addrole': 'add', 'giverole': 'add',
    'remove': 'remove', 'removerole': 'remove', 'derole': 'remove', 'revokerole': 'remove', 'cabutrole': 'remove',
    'all': 'all', 'roleall': 'all', 'massrole': 'all', 'ra': 'all'
};

module.exports = {
    name: 'role',
    aliases: Object.keys(aliasMap),
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Sistem manajemen kontrol role server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        
        // Subcommand: Add
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Memberikan sebuah role/pangkat kepada member.')
                .addUserOption(option => option.setName('target').setDescription('Member yang akan menerima role').setRequired(true))
                .addRoleOption(option => option.setName('role').setDescription('Role yang ingin diberikan').setRequired(true))
                .addStringOption(option => option.setName('alasan').setDescription('Alasan pemberian role (Opsional)').setRequired(false))
        )
        // Subcommand: Remove
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Mencabut sebuah role/pangkat dari member.')
                .addUserOption(option => option.setName('target').setDescription('Member yang rolenya akan dicabut').setRequired(true))
                .addRoleOption(option => option.setName('role').setDescription('Role yang ingin dicabut').setRequired(true))
                .addStringOption(option => option.setName('alasan').setDescription('Alasan pencabutan role (Opsional)').setRequired(false))
        )
        // Subcommand: All (Massal)
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Memberikan atau mencabut role dari SEMUA member di server.')
                .addStringOption(option =>
                    option.setName('aksi')
                        .setDescription('Pilih tindakan')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tambah Role (Add)', value: 'add' },
                            { name: 'Cabut Role (Remove)', value: 'remove' }
                        )
                )
                .addRoleOption(option => option.setName('role').setDescription('Role yang ingin diproses').setRequired(true))
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction && options.flags) delete options.flags;
            return await context.reply(options);
        };

        let subcommand = '';
        let targetUser = null;
        let role = null;
        let massAction = ''; 
        let reason = 'Tidak ada alasan';

        if (isInteraction) {
            subcommand = context.options.getSubcommand();
            targetUser = context.options.getUser('target');
            role = context.options.getRole('role');
            reason = context.options.getString('alasan') || 'Tidak ada alasan';
            if (subcommand === 'all') massAction = context.options.getString('aksi');
        } else {
            // --- 🛠️ RESOLUSI TOKEN SUBCOMMAND BERBASIS TEKS PREFIX ---
            const tokens = context.content.toLowerCase().split(/ +/);
            const firstToken = tokens[0] || '';  
            const secondToken = tokens[1] || ''; 
            const thirdToken = tokens[2] || '';  

            // 1. Deteksi format terpisah spasi (Contoh: ln derole, ln cabutrole)
            if (aliasMap[secondToken]) {
                subcommand = aliasMap[secondToken];
                // Penanganan jika menggunakan format: ln role remove @user @role
                if (secondToken === 'role' && aliasMap[thirdToken]) {
                    subcommand = aliasMap[thirdToken];
                }
            } 
            // 2. Deteksi jika perintah menempel pada prefix (Contoh: lnderole, lnaddrole)
            else {
                const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
                for (const alias of sortedAliases) {
                    if (firstToken.endsWith(alias)) {
                        subcommand = aliasMap[alias];
                        break;
                    }
                }
            }

            // Fallback tradisional menggunakan argumen pertama
            if (!subcommand && args && args[0]) {
                const possibleSub = args[0].toLowerCase();
                if (aliasMap[possibleSub]) {
                    subcommand = aliasMap[possibleSub];
                }
            }

            // Jika benar-benar tidak terdeteksi, berikan fallback default keamanan
            if (!subcommand) subcommand = 'add';

            // Resolusi massAction otomatis untuk subcommand 'all'
            if (subcommand === 'all') {
                const fullText = context.content.toLowerCase();
                if (fullText.includes('add') || fullText.includes('tambah') || fullText.includes('give')) {
                    massAction = 'add';
                } else if (fullText.includes('remove') || fullText.includes('cabut') || fullText.includes('hapus') || fullText.includes('derole') || fullText.includes('revoke')) {
                    massAction = 'remove';
                } else if (args && args[0]) {
                    massAction = args[0].toLowerCase();
                }
            }

            // --- 🛠️ EKSTRAKSI PASANGAN TARGET & ROLE SECARA DINAMIS ---
            targetUser = context.mentions.users.first();
            const roleMention = context.mentions.roles.first();

            if (args && args.length > 0) {
                for (const arg of args) {
                    const cleanId = arg.replace(/[^0-9]/g, '');
                    if (!cleanId) continue;

                    if (!targetUser) {
                        const isRole = context.guild.roles.cache.has(cleanId);
                        if (!isRole) {
                            targetUser = await client.users.fetch(cleanId).catch(() => null);
                            continue;
                        }
                    }
                    if (!role) {
                        const guildRole = context.guild.roles.cache.get(cleanId);
                        if (guildRole) role = guildRole;
                    }
                }
            }
            if (roleMention) role = roleMention;

            // Memisahkan sisa argumen teks murni untuk dijadikan alasan (Reason)
            if (args && args.length > 0) {
                const excludedWords = [...Object.keys(aliasMap), 'role'];
                const cleanArgs = args.filter(arg => {
                    const cleanStr = arg.replace(/[^0-9]/g, '');
                    if (cleanStr === targetUser?.id || cleanStr === role?.id) return false;
                    if (excludedWords.includes(arg.toLowerCase())) return false;
                    return true;
                }).join(' ').trim();
                
                if (cleanArgs) reason = cleanArgs;
            }
        }

        // --- 2. VALIDASI OTORISASI PERMISSION ---
        if (!isInteraction) {
            const requiredPerm = subcommand === 'all' ? PermissionFlagsBits.Administrator : PermissionFlagsBits.ManageRoles;
            const permName = subcommand === 'all' ? 'Administrator' : 'Manage Roles';
            if (!context.member.permissions.has(requiredPerm)) {
                return sendResponse({ 
                    embeds: [embed.error(userExecutor, 'Akses Ditolak', `Kamu tidak memiliki izin \`${permName}\` untuk menggunakan perintah ini.`)] 
                });
            }
        }

        // --- 3. VALIDASI INPUT ---
        if (subcommand === 'all') {
            if (!massAction || !['add', 'remove'].includes(massAction) || !role) {
                return sendResponse({
                    embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Format salah! Gunakan: `!role all [add/remove] [@role/ID_Role]`')],
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } else {
            if (!targetUser || !role) {
                return sendResponse({
                    embeds: [embed.error(userExecutor, 'Gagal Perintah', `Format salah! Gunakan: \`!role ${subcommand} [@user] [@role] [alasan]\``)],
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }

        // --- 4. VALIDASI HIERARKI ROLE BOT ---
        const botHighestRole = context.guild.members.me.roles.highest;
        if (role.position >= botHighestRole.position) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Akses Ditolak', `Aku tidak bisa mengelola role **${role.name}** karena posisi role tersebut lebih tinggi atau setara dengan role tertinggiku!`)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const guildData = await GuildSettings.findOne({ guildId: context.guild.id });

        // ==========================================
        // EKSEKUSI SUBCOMMAND: ADD / REMOVE
        // ==========================================
        if (subcommand === 'add' || subcommand === 'remove') {
            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan di server.')], flags: [MessageFlags.Ephemeral] });
            }

            if (subcommand === 'add') {
                if (targetMember.roles.cache.has(role.id)) {
                    return sendResponse({ embeds: [embed.info(userExecutor, 'Sudah Memiliki', `**${targetUser.username}** sudah memiliki role ${role.name}.`)], flags: [MessageFlags.Ephemeral] });
                }
                try {
                    await targetMember.roles.add(role);
                    
                    if (guildData && guildData.logChannel) {
                        const logChan = context.guild.channels.cache.get(guildData.logChannel);
                        if (logChan) {
                            const logEmbed = new EmbedBuilder()
                                .setAuthor({ name: context.guild.name, iconURL: context.guild.iconURL({ dynamic: true }) })
                                .setTitle('📥 Role Berhasil Diberikan')
                                .setThumbnail(context.client.user.displayAvatarURL({ dynamic: true }))
                                .setColor('#2ecc71')
                                .setDescription(`Role **${role.name}** telah berhasil diberikan kepada member berikut:`)
                                .addFields(
                                    { name: '👤 Target', value: `${targetUser}\n\`${targetUser.username}\``, inline: true },
                                    { name: '🛡️ Admin', value: `${userExecutor}\n\`${userExecutor.username}\``, inline: true },
                                    { name: '📌 Alasan', value: reason, inline: false }
                                )
                                .setFooter({ text: `${context.guild.name} Moderation System` })
                                .setTimestamp();
                            await logChan.send({ embeds: [logEmbed] }).catch(() => null);
                        }
                    }

                    return await sendResponse({ embeds: [embed.success(userExecutor, '✅ Role Diberikan', `Role ${role} telah berhasil diberikan kepada **${targetUser.username}**.`)] });
                } catch (error) {
                    logger.error(`[ROLE ADD ERROR] Gagal menambahkan role ke ${targetUser.id}`, error);
                    return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan saat menambahkan role.')], flags: [MessageFlags.Ephemeral] });
                }
            } else {
                if (!targetMember.roles.cache.has(role.id)) {
                    return sendResponse({ embeds: [embed.info(userExecutor, 'Tidak Memiliki', `**${targetUser.username}** memang tidak memiliki role ${role.name}.`)], flags: [MessageFlags.Ephemeral] });
                }
                try {
                    await targetMember.roles.remove(role);

                    if (guildData && guildData.logChannel) {
                        const logChan = context.guild.channels.cache.get(guildData.logChannel);
                        if (logChan) {
                            const logEmbed = new EmbedBuilder()
                                .setAuthor({ name: context.guild.name, iconURL: context.guild.iconURL({ dynamic: true }) })
                                .setTitle('🗑️ Role Berhasil Dihapus')
                                .setThumbnail(context.client.user.displayAvatarURL({ dynamic: true }))
                                .setColor('#3498db') 
                                .setDescription(`Role **${role.name}** telah berhasil dihapus dari member berikut:`)
                                .addFields(
                                    { name: '👤 Target', value: `${targetUser}\n\`${targetUser.username}\``, inline: true },
                                    { name: '🛡️ Admin', value: `${userExecutor}\n\`${userExecutor.username}\``, inline: true },
                                    { name: '📌 Alasan', value: reason, inline: false }
                                )
                                .setFooter({ text: `${context.guild.name} Moderation System` })
                                .setTimestamp();
                            await logChan.send({ embeds: [logEmbed] }).catch(() => null);
                        }
                    }

                    return await sendResponse({ embeds: [embed.success(userExecutor, '❌ Role Dicabut', `Role ${role} telah berhasil dicabut dari **${targetUser.username}**.`)] });
                } catch (error) {
                    logger.error(`[ROLE REMOVE ERROR] Gagal mencabut role dari ${targetUser.id}`, error);
                    return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan saat mencabut role.')], flags: [MessageFlags.Ephemeral] });
                }
            }
        }

        // ==========================================
        // EKSEKUSI SUBCOMMAND: ALL (MASSAL)
        // ==========================================
        if (subcommand === 'all') {
            if (isInteraction) {
                await context.deferReply();
            } else {
                var loadingMessage = await context.reply({ content: '⏳ Menghubungkan ke API Discord...' });
            }

            const updateStatus = async (options) => {
                if (isInteraction) return await context.editReply(options);
                return await loadingMessage.edit(options);
            };

            try {
                const members = await context.guild.members.fetch();
                let successCount = 0;

                if (massAction === 'add') {
                    const targetMembers = members.filter(m => !m.roles.cache.has(role.id) && !m.user.bot);
                    if (targetMembers.size === 0) {
                        return await updateStatus({ embeds: [embed.info(userExecutor, 'Selesai', `Semua member (selain bot) sudah memiliki role ${role.name}.`)] });
                    }

                    await updateStatus({ embeds: [embed.info(userExecutor, 'Sedang Memproses...', `Mulai memberikan role ${role.name} kepada **${targetMembers.size}** member. Mohon tunggu...`)] });

                    for (const member of targetMembers.values()) {
                        await member.roles.add(role).catch(() => null);
                        successCount++;
                        await sleep(250); 
                    }
                    
                    const embedRes = [embed.success(userExecutor, '✅ Selesai', `Berhasil menambahkan role ${role} kepada **${successCount}** member!`)];
                    return isInteraction ? await context.followUp({ embeds: embedRes }) : await context.channel.send({ embeds: embedRes });
                } 
                else if (massAction === 'remove') {
                    const targetMembers = members.filter(m => m.roles.cache.has(role.id));
                    if (targetMembers.size === 0) {
                        return await updateStatus({ embeds: [embed.info(userExecutor, 'Selesai', `Tidak ada member yang memiliki role ${role.name} saat ini.`)] });
                    }

                    await updateStatus({ embeds: [embed.info(userExecutor, 'Sedang Memproses...', `Mulai mencabut role ${role.name} dari **${targetMembers.size}** member. Mohon tunggu...`)] });

                    for (const member of targetMembers.values()) {
                        await member.roles.remove(role).catch(() => null);
                        successCount++;
                        await sleep(250);
                    }

                    const embedRes = [embed.success(userExecutor, '❌ Selesai', `Berhasil mencabut role ${role} dari **${successCount}** member!`)];
                    return isInteraction ? await context.followUp({ embeds: embedRes }) : await context.channel.send({ embeds: embedRes });
                }
            } catch (error) {
                logger.error(`[ROLE ALL ERROR] Gagal memproses massal di guild ${context.guild.id}`, error);
                return await updateStatus({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan sistem saat memproses tindakan massal.')] });
            }
        }
    }
};
