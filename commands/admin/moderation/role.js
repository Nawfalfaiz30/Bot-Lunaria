const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const GuildSettings = require('../../../models/guildSchema');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'role',
    aliases: ['addrole', 'removerole', 'roleall', 'giverole', 'derole', 'revokerole', 'cabutrole', 'massrole', 'ra'],
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
            // Dapatkan prefix bot dari setelan guild atau gunakan default
            const guildSettings = await GuildSettings.findOne({ guildId: context.guild.id });
            const prefix = guildSettings?.prefix || client.prefix || '!';

            // Ekstrak nama panggilan murni, abaikan prefix
            let commandCalled = context.content.split(' ')[0];
            if (commandCalled.toLowerCase().startsWith(prefix.toLowerCase())) {
                commandCalled = commandCalled.slice(prefix.length);
            }
            commandCalled = commandCalled.toLowerCase();
            
            // Penguncian Jalur Subcommand Berdasarkan Kata Kunci Command Teks
            if (['addrole', 'giverole'].includes(commandCalled) || (commandCalled === 'role' && args[0] === 'add')) {
                subcommand = 'add';
                if (commandCalled === 'role') args.shift(); 
            } else if (['removerole', 'derole', 'revokerole', 'cabutrole'].includes(commandCalled) || (commandCalled === 'role' && args[0] === 'remove')) {
                subcommand = 'remove';
                if (commandCalled === 'role') args.shift();
            } else if (['roleall', 'massrole', 'ra'].includes(commandCalled) || (commandCalled === 'role' && args[0] === 'all')) {
                subcommand = 'all';
                if (commandCalled === 'role') args.shift();
                massAction = args[0] ? args[0].toLowerCase() : null;
                if (massAction) args.shift(); 
            } else {
                subcommand = 'add'; // Default fallback
            }

            // Parsing Parameter data Mentions & ID (Prefix Mode)
            if (subcommand === 'all') {
                const roleMention = context.mentions.roles.first();
                role = roleMention || (args && args[0] ? await context.guild.roles.fetch(args[0]).catch(() => null) : null);
            } else {
                targetUser = context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
                const roleMention = context.mentions.roles.first();
                role = roleMention || (args && args[1] ? await context.guild.roles.fetch(args[1].replace(/[^0-9]/g, '')).catch(() => null) : null);
                
                // Mengambil sisa argumen teks di bagian akhir kalimat sebagai Alasan (Reason)
                if (args && args.length > 2) {
                    // Jika argumen diinput menggunakan format tag/mention, saring sisa teksnya
                    const cleanArgs = args.slice(2).join(' ').trim();
                    if (cleanArgs) reason = cleanArgs;
                }
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

        // Fetching konfigurasi channel log server dari Database MongoDB
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
                    
                    // =========================================================
                    // 🎨 DESAIN LOG PREMIUM GRID 2 KOLOM (SEPERTI IMAGE_B1AC72.PNG)
                    // =========================================================
                    if (guildData && guildData.logChannel) {
                        const logChan = context.guild.channels.cache.get(guildData.logChannel);
                        if (logChan) {
                            const logEmbed = new EmbedBuilder()
                                .setAuthor({ name: context.guild.name, iconURL: context.guild.iconURL({ dynamic: true }) })
                                .setTitle('📥 Role Berhasil Diberikan')
                                .setThumbnail(context.client.user.displayAvatarURL({ dynamic: true })) // Ganti dengan profil bot sebagai visual pendamping
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

                    // =========================================================
                    // 🎨 DESAIN LOG PREMIUM GRID 2 KOLOM (SEPERTI IMAGE_B1AC72.PNG)
                    // =========================================================
                    if (guildData && guildData.logChannel) {
                        const logChan = context.guild.channels.cache.get(guildData.logChannel);
                        if (logChan) {
                            const logEmbed = new EmbedBuilder()
                                .setAuthor({ name: context.guild.name, iconURL: context.guild.iconURL({ dynamic: true }) })
                                .setTitle('🗑️ Role Berhasil Dihapus')
                                .setThumbnail(context.client.user.displayAvatarURL({ dynamic: true })) // Profil bot sebagai pendamping kanan
                                .setColor('#3498db') // Biru cerah premium sesuai gambar referensi Anda
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