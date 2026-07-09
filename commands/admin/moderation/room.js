const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');

const aliasMap = {
    'lock': 'lock', 'kunci': 'lock',
    'unlock': 'unlock', 'buka': 'unlock', 'open': 'unlock',
    'nuke': 'nuke', 'reset': 'nuke', 'hancurkan': 'nuke',
    'purge': 'purge', 'clear': 'purge', 'hapus': 'purge', 'clean': 'purge',
    'slowmode': 'slowmode', 'sm': 'slowmode', 'cooldownchat': 'slowmode',
    'vmute': 'vmute', 'voicemute': 'vmute', 'vm': 'vmute',
    'vunmute': 'vunmute', 'voiceunmute': 'vunmute', 'vunm': 'vunmute',
    'announce': 'announce', 'pengumuman': 'announce',
    'rules': 'rules', 'peraturan': 'rules'
};

module.exports = {
    name: 'room',
    aliases: Object.keys(aliasMap),
    data: new SlashCommandBuilder()
        .setName('room')
        .setDescription('Sistem manajemen kontrol lingkungan chat teks, saluran suara, dan pusat informasi server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub => sub.setName('lock').setDescription('Mengunci channel ini agar member biasa tidak bisa mengirim pesan.'))
        .addSubcommand(sub => sub.setName('unlock').setDescription('Membuka kunci channel ini agar member bisa mengirim pesan kembali.'))
        .addSubcommand(sub => sub.setName('nuke').setDescription('MENGHANCURKAN channel ini dan membuat ulang yang baru (Reset total chat).'))
        .addSubcommand(sub =>
            sub.setName('purge')
                .setDescription('Menghapus banyak pesan sekaligus dari channel ini (Maksimal usia pesan 14 hari).')
                .addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah pesan yang ingin dihapus (1 - 100)').setRequired(true).setMinValue(1).setMaxValue(100))
        )
        .addSubcommand(sub =>
            sub.setName('slowmode')
                .setDescription('Mengatur mode lambat (slowmode) pada channel ini.')
                .addIntegerOption(opt => opt.setName('detik').setDescription('Jumlah jeda waktu dalam detik (Ketik 0 untuk mematikan)').setRequired(true).setMinValue(0).setMaxValue(21600))
        )
        .addSubcommand(sub =>
            sub.setName('vmute')
                .setDescription('Membisukan (Server Mute) member yang sedang berada di Voice Channel.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dibisukan').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('vunmute')
                .setDescription('Mencabut bisu (Server Unmute) member di Voice Channel.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dicabut bisunya').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('announce')
                .setDescription('🛡️ [ADMIN] Membuat pengumuman resmi dengan tampilan rapi.')
                .addChannelOption(opt => opt.setName('channel').setDescription('Pilih channel tujuan').setRequired(true).addChannelTypes(ChannelType.GuildText))
                .addStringOption(opt => opt.setName('judul').setDescription('Judul pengumuman').setRequired(true))
                .addStringOption(opt => opt.setName('isi').setDescription('Isi pengumuman (gunakan \\n untuk baris baru)').setRequired(true))
                .addRoleOption(opt => opt.setName('mention').setDescription('Role yang ingin di-mention').setRequired(false))
                .addStringOption(opt => opt.setName('ping').setDescription('Jenis ping global').setRequired(false).addChoices(
                    { name: '@everyone', value: 'everyone' },
                    { name: '@here', value: 'here' }
                ))
        )
        .addSubcommand(sub => 
            sub.setName('rules')
                .setDescription('🛡️ [ADMIN] Mengirimkan peraturan resmi server Lunaria.')
        ),

    async execute(context, args = [], client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction) {
                if (options.flags) delete options.flags;
                options.failIfNotExists = false; 
            }
            return await context.reply(options);
        };

        // --- 🛠️ RESOLUSI SUBCOMMAND KINI 100% AMAN ---
        let subcommand = '';
        let commandArgs = [...args];

        if (isInteraction) {
            subcommand = context.options.getSubcommand();
        } else {
            const fullContent = context.content.toLowerCase().trim();
            const words = fullContent.split(/ +/);
            
            // 1. Ekstraksi kata pemicu utama dari pesan
            let matchedTrigger = '';
            const allTriggers = ['room', ...Object.keys(aliasMap)].sort((a, b) => b.length - a.length);

            // Periksa apakah pesan mengandung salah satu kata pemicu (room atau aliasnya)
            for (const trigger of allTriggers) {
                // regex memastikan trigger berdiri sendiri sebagai nama command/alias (misal cocok untuk "luna purge", "luna room")
                const regex = new RegExp(`\\b${trigger}\\b`);
                if (regex.test(fullContent)) {
                    matchedTrigger = trigger;
                    break;
                }
            }

            if (matchedTrigger) {
                if (matchedTrigger === 'room') {
                    // Jika formatnya: luna room purge 4
                    if (commandArgs.length > 0) {
                        const subFirst = commandArgs[0].toLowerCase();
                        if (aliasMap[subFirst]) {
                            subcommand = aliasMap[subFirst];
                            commandArgs.shift(); // Buang teks alias, sisakan parameternya (seperti angka 4)
                        }
                    }
                } else {
                    // Jika langsung memanggil aliasnya: luna purge 4 atau luna sm 4
                    subcommand = aliasMap[matchedTrigger];
                    
                    // Kita bersihkan args dari kata pemicu alias jika tidak sengaja masuk ke array args
                    if (commandArgs[0] && commandArgs[0].toLowerCase() === matchedTrigger) {
                        commandArgs.shift();
                    }
                }
            }

            const validSubcommands = ['lock', 'unlock', 'nuke', 'purge', 'slowmode', 'vmute', 'vunmute', 'announce', 'rules'];
            if (!subcommand || !validSubcommands.includes(subcommand)) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Subcommand tidak valid.\nOpsi: `lock`, `unlock`, `nuke`, `purge`, `slowmode`, `vmute`, `vunmute`, `announce`, `rules`')] });
            }
        }

        // --- PENGECEKAN HAK AKSES PERMISSION ---
        let reqPerm = null;
        let permName = '';

        if (['lock', 'unlock', 'slowmode'].includes(subcommand)) { reqPerm = PermissionFlagsBits.ManageChannels; permName = 'Manage Channels'; }
        else if (['nuke', 'announce', 'rules'].includes(subcommand)) { reqPerm = PermissionFlagsBits.Administrator; permName = 'Administrator'; }
        else if (subcommand === 'purge') { reqPerm = PermissionFlagsBits.ManageMessages; permName = 'Manage Messages'; }
        else if (['vmute', 'vunmute'].includes(subcommand)) { reqPerm = PermissionFlagsBits.MuteMembers; permName = 'Mute Members'; }

        if (reqPerm && !context.member.permissions.has(reqPerm)) {
            return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', `Kamu tidak memiliki izin \`${permName}\` untuk menggunakan operasi ini.`)], flags: [MessageFlags.Ephemeral] });
        }

        const everyoneRole = context.guild.roles.everyone;

        // --- CASE 1: LOCK ---
        if (subcommand === 'lock') {
            try {
                const currentOverwrite = context.channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (currentOverwrite && currentOverwrite.deny.has(PermissionFlagsBits.SendMessages)) {
                    return await sendResponse({ embeds: [embed.error(userExecutor, '🔒 Channel Sudah Terkunci', 'Channel ini sudah dalam kondisi terkunci sebelumnya.')] });
                }

                await context.channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false, AddReactions: false });
                return await sendResponse({ embeds: [embed.success(userExecutor, '🔒 Channel Dikunci', 'Channel ini telah dikunci. Member biasa tidak bisa lagi mengirim pesan ke sini.')] });
            } catch (error) {
                return await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mengunci channel.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 2: UNLOCK ---
        if (subcommand === 'unlock') {
            try {
                const currentOverwrite = context.channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (!currentOverwrite || !currentOverwrite.deny.has(PermissionFlagsBits.SendMessages)) {
                    return await sendResponse({ embeds: [embed.error(userExecutor, '🔓 Channel Sudah Terbuka', 'Channel ini sudah dalam kondisi terbuka.')] });
                }

                await context.channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null, AddReactions: null });
                return await sendResponse({ embeds: [embed.success(userExecutor, '🔓 Channel Dibuka', 'Kunci channel telah dibuka. Member sekarang dapat berinteraksi kembali.')] });
            } catch (error) {
                return await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal membuka kunci channel.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 3: NUKE ---
        if (subcommand === 'nuke') {
            const channel = context.channel;
            if (channel.type !== ChannelType.GuildText) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Operasi Gagal', 'Fitur Nuke hanya dapat digunakan pada text channel biasa!')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                const newChannel = await channel.clone({ reason: `Nuked oleh ${userExecutor.tag}` });
                await newChannel.setPosition(channel.position);
                await channel.delete().catch(() => null);
                
                return await newChannel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('☢️ CHANNEL NUKED')
                        .setColor('#2ecc71')
                        .setDescription('Channel ini telah dihancurkan dan dibuat ulang dari nol.\nSemua riwayat obrolan sebelumnya telah dihapus permanen.')
                        .setTimestamp()
                    ]
                });
            } catch (error) {
                logger.error(`[NUKE ERROR] Gagal melakukan nuke di channel ${channel.name}`, error);
                return await context.reply({ content: '❌ Gagal melakukan Nuke. Cek permission posisi bot.' }).catch(() => null);
            }
        }

        // --- CASE 4: PURGE ---
        if (subcommand === 'purge') {
            let amount = isInteraction ? context.options.getInteger('jumlah') : (commandArgs[0] ? parseInt(commandArgs[0]) : null);

            if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Jumlah Tidak Valid', 'Tentukan jumlah pesan antara **1 sampai 100**!\nContoh: `luna purge 50` atau `luna room clear 50`')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                if (!isInteraction && context.deletable) await context.delete().catch(() => null);

                const deletedMessages = await context.channel.bulkDelete(amount, true);
                if (deletedMessages.size === 0) {
                    return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Tidak ada pesan yang bisa dihapus (maksimal batas usia pesan 14 hari).')], flags: [MessageFlags.Ephemeral] });
                }

                const replyMessage = await sendResponse({ embeds: [embed.success(userExecutor, '🧹 Pembersihan Selesai', `Berhasil menghapus **${deletedMessages.size}** pesan.`)], flags: [MessageFlags.Ephemeral] });
                if (!isInteraction && replyMessage) {
                    setTimeout(() => replyMessage.delete().catch(() => null), 3000);
                }
            } catch (error) {
                logger.error('[PURGE ERROR] Gagal melakukan bulk delete', error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan saat menghapus pesan.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 5: SLOWMODE ---
        if (subcommand === 'slowmode') {
            const time = isInteraction ? context.options.getInteger('detik') : (commandArgs[0] ? parseInt(commandArgs[0]) : null);

            if (time === null || isNaN(time) || time < 0 || time > 21600) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Angka Tidak Valid', 'Tentukan durasi jeda waktu antara **0 sampai 21600** detik!')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                await context.channel.setRateLimitPerUser(time, `Diubah oleh ${userExecutor.tag}`);
                if (time === 0) {
                    return await sendResponse({ embeds: [embed.success(userExecutor, 'Slowmode Dimatikan', 'Mode lambat telah dinonaktifkan.')] });
                } else {
                    return await sendResponse({ embeds: [embed.success(userExecutor, 'Slowmode Diaktifkan', `Mode lambat diatur ke **${time} detik**.`)] });
                }
            } catch (error) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mengatur slowmode.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 6 & 7: VMUTE & VUNMUTE ---
        if (['vmute', 'vunmute'].includes(subcommand)) {
            let targetUser = isInteraction ? context.options.getUser('target') : (context.mentions.users.first() || (commandArgs[0] ? await client.users.fetch(commandArgs[0]).catch(() => null) : null));

            if (!targetUser) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', `Format salah! Gunakan: \`luna room ${subcommand} [@user/ID]\``)], flags: [MessageFlags.Ephemeral] });

            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember || !targetMember.voice.channel) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan di Voice Channel.')], flags: [MessageFlags.Ephemeral] });

            try {
                if (subcommand === 'vmute') {
                    await targetMember.voice.setMute(true, `V-Mute oleh ${userExecutor.tag}`);
                    return await sendResponse({ embeds: [embed.success(userExecutor, '🎙️ Voice Mute', `**${targetUser.tag}** telah dibisukan di Voice Channel.`)] });
                } else {
                    await targetMember.voice.setMute(false, `V-Unmute oleh ${userExecutor.tag}`);
                    return await sendResponse({ embeds: [embed.success(userExecutor, '🔊 Voice Unmute', `Suara **${targetUser.tag}** telah dipulihkan.`)] });
                }
            } catch (error) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mengeksekusi aksi voice.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 8: ANNOUNCE (PENGUMUMAN) ---
        if (subcommand === 'announce') {
            let targetChannel, title, content, role, pingType;

            if (isInteraction) {
                targetChannel = context.options.getChannel('channel');
                title = context.options.getString('judul');
                const rawContent = context.options.getString('isi');
                content = rawContent.replace(/\\n/g, '\n').replace(/\n\s*\n/g, '\n\n');
                role = context.options.getRole('mention');
                pingType = context.options.getString('ping');
            } else {
                targetChannel = context.mentions.channels.first();
                if (!targetChannel) return sendResponse({ embeds: [embed.error(userExecutor, 'Format Salah', 'Tag channel tujuan! Contoh: `luna room pengumuman #channel Judul | Isi`')] });

                const textRaw = commandArgs.slice(1).join(' ');
                if (!textRaw.includes('|')) return sendResponse({ embeds: [embed.error(userExecutor, 'Format Salah', 'Gunakan pembatas `|` → `Judul | Isi`')] });

                const [parsedTitle, parsedContent] = textRaw.split('|').map(s => s.trim());
                title = parsedTitle;
                content = parsedContent.replace(/\\n/g, '\n');
            }

            try {
                const announceEmbed = new EmbedBuilder()
                    .setTitle(`🌸 ${title}`)
                    .setDescription(content)
                    .setColor('#FF1493')
                    .setThumbnail(context.guild.iconURL({ dynamic: true, size: 128 }))
                    .setFooter({ text: `${context.guild.name} • Pengumuman Resmi`, iconURL: context.guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                let pingText = '';
                if (pingType === 'everyone') pingText = '@everyone';
                else if (pingType === 'here') pingText = '@here';
                else if (role) pingText = `<@&${role.id}>`;

                if (pingText) {
                    await targetChannel.send({ content: pingText, embeds: [announceEmbed] });
                } else {
                    await targetChannel.send({ embeds: [announceEmbed] });
                }

                const successAnnounce = embed.success(userExecutor, '✅ Berhasil', `Pengumuman telah dikirim ke ${targetChannel}`);
                const res = await sendResponse({ embeds: [successAnnounce], flags: [MessageFlags.Ephemeral] });
                if (!isInteraction && res) setTimeout(() => res.delete().catch(() => {}), 4000);
            } catch (error) {
                logger.error('[ERROR PENGUMUMAN]', error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Pastikan bot memiliki izin kirim pesan di channel target.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 9: RULES (PERATURAN) ---
        if (subcommand === 'rules') {
            const rulesEmbed = new EmbedBuilder()
                .setTitle('🌸 PERATURAN RESMI')
                .setDescription(`**${context.guild.name}** — Komunitas Harmonis & Edukatif\n\nUntuk menjaga suasana nyaman dan penuh rasa hormat, setiap member wajib mematuhi aturan berikut:`)
                .setColor('#E91E63')
                .setThumbnail(context.guild.iconURL({ dynamic: true, size: 512 }))
                .setFooter({ text: `🌸 ${context.guild.name} • Patuhi peraturan demi kenyamanan bersama`, iconURL: context.guild.iconURL() })
                .setTimestamp()
                .addFields(
                    { name: '🤝 1. Sikap & Etika', value: 'Saling menghormati, tidak bullying, hate speech, rasisme, SARA, atau toxic behavior.', inline: false },
                    { name: '🎌 2. Bahasa Komunikasi', value: 'Bahasa utama **Indonesia**. Gunakan bahasa yang sopan dan mudah dimengerti.', inline: false },
                    { name: '🔞 3. Konten NSFW / SARA', value: 'Dilarang keras menyebarkan konten dewasa/gore di seluruh teks channel publik.', inline: false },
                    { name: '🎵 4. Voice Channel', value: 'Dilarang earrape, memutar soundboard mengganggu, atau melakukan *trolling* suara.', inline: false },
                    { name: '🔗 5. Spanning & Self-Promotion', value: 'Dilarang spam chatting, spam mention, atau membagikan link undangan server lain tanpa izin.', inline: false },
                    { name: '⚖️ 6. Sistem Sanksi', value: '• Pelanggaran Ringan: Teguran / Warn\n• Pelanggaran Sedang: Timeout / Mute\n• Pelanggaran Berat: Kick / Kick & Ban Permanen.', inline: false }
                );

            try {
                await context.channel.send({ embeds: [rulesEmbed] });
                const confirmRules = embed.success(userExecutor, '✅ Peraturan Dipasang', 'Papan peraturan resmi server telah dikirim ke channel ini.');
                const res = await sendResponse({ embeds: [confirmRules], flags: [MessageFlags.Ephemeral] });
                if (!isInteraction && res) setTimeout(() => res.delete().catch(() => {}), 4000);
            } catch (error) {
                logger.error('[ERROR RULES]', error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Mengirim', 'Cek perizinan bot di channel ini.')], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};