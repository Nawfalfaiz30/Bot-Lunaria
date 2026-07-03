const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');

// Pemetaan seluruh alias ke subcommand inti
const aliasMap = {
    'lock': 'lock', 'kunci': 'lock',
    'unlock': 'unlock', 'buka': 'unlock', 'open': 'unlock',
    'nuke': 'nuke', 'reset': 'nuke', 'hancurkan': 'nuke',
    'purge': 'purge', 'clear': 'purge', 'hapus': 'purge', 'clean': 'purge',
    'slowmode': 'slowmode', 'sm': 'slowmode', 'cooldownchat': 'slowmode',
    'vmute': 'vmute', 'voicemute': 'vmute', 'vm': 'vmute',
    'vunmute': 'vunmute', 'voiceunmute': 'vunmute', 'vunm': 'vunmute'
};

module.exports = {
    name: 'room',
    aliases: Object.keys(aliasMap), // Otomatis mendaftarkan seluruh key alias di atas
    data: new SlashCommandBuilder()
        .setName('room')
        .setDescription('Sistem manajemen kontrol lingkungan chat teks dan saluran suara server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        
        // Subcommand: Lock
        .addSubcommand(sub => sub.setName('lock').setDescription('Mengunci channel ini agar member biasa tidak bisa mengirim pesan.'))
        
        // Subcommand: Unlock
        .addSubcommand(sub => sub.setName('unlock').setDescription('Membuka kunci channel ini agar member bisa mengirim pesan kembali.'))
        
        // Subcommand: Nuke
        .addSubcommand(sub => sub.setName('nuke').setDescription('MENGHANCURKAN channel ini dan membuat ulang yang baru (Reset total chat).'))
        
        // Subcommand: Purge
        .addSubcommand(sub =>
            sub.setName('purge')
                .setDescription('Menghapus banyak pesan sekaligus dari channel ini (Maksimal usia pesan 14 hari).')
                .addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah pesan yang ingin dihapus (1 - 100)').setRequired(true).setMinValue(1).setMaxValue(100))
        )
        
        // Subcommand: Slowmode
        .addSubcommand(sub =>
            sub.setName('slowmode')
                .setDescription('Mengatur mode lambat (slowmode) pada channel ini.')
                .addIntegerOption(opt => opt.setName('detik').setDescription('Jumlah jeda waktu dalam detik (Ketik 0 untuk mematikan)').setRequired(true).setMinValue(0).setMaxValue(21600))
        )
        
        // Subcommand: Vmute
        .addSubcommand(sub =>
            sub.setName('vmute')
                .setDescription('Membisukan (Server Mute) member yang sedang berada di Voice Channel.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dibisukan').setRequired(true))
        )
        
        // Subcommand: Vunmute
        .addSubcommand(sub =>
            sub.setName('vunmute')
                .setDescription('Mencabut bisu (Server Unmute) member di Voice Channel.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dicabut bisunya').setRequired(true))
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction && options.flags) delete options.flags;
            return await context.reply(options);
        };

        // --- 🛠️ FIX LOGIKA RESOLUSI SUBCOMMAND (ANTI-BUG SPASI & ALIAS) ---
        let subcommand = '';
        if (isInteraction) {
            subcommand = context.options.getSubcommand();
        } else {
            const tokens = context.content.toLowerCase().split(/ +/);
            const firstToken = tokens[0] || '';
            const secondToken = tokens[1] || '';

            // 1. Cek apakah kata kedua adalah alias/subcommand langsung (Contoh: ln lock, ln sm 10)
            if (aliasMap[secondToken]) {
                subcommand = aliasMap[secondToken];
            } 
            // 2. Cek apakah kata pertama berakhiran alias (Contoh: lnlock, lnsm)
            else {
                const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
                for (const alias of sortedAliases) {
                    if (firstToken.endsWith(alias)) {
                        subcommand = aliasMap[alias];
                        break;
                    }
                }
            }

            // 3. Cadangan jika dipanggil lewat nama utama (Contoh: ln room slowmode 10, ln room sm 10)
            if (!subcommand && args && args[0]) {
                const possibleSub = args[0].toLowerCase();
                if (aliasMap[possibleSub]) {
                    subcommand = aliasMap[possibleSub];
                    args.shift(); 
                } else {
                    subcommand = possibleSub;
                    args.shift();
                }
            }

            // Validasi final kelayakan subcommand
            const validSubcommands = ['lock', 'unlock', 'nuke', 'purge', 'slowmode', 'vmute', 'vunmute'];
            if (!subcommand || !validSubcommands.includes(subcommand)) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Subcommand tidak valid atau tidak ditemukan.\nOpsi: `lock`, `unlock`, `nuke`, `purge`, `slowmode`, `vmute`, `vunmute`')] });
            }
        }

        // --- PENGECEKAN HAK AKSES PERMISSION (Mode Teks Prefix) ---
        if (!isInteraction) {
            let reqPerm = null;
            let permName = '';

            if (['lock', 'unlock', 'slowmode'].includes(subcommand)) { reqPerm = PermissionFlagsBits.ManageChannels; permName = 'Manage Channels'; }
            else if (subcommand === 'nuke') { reqPerm = PermissionFlagsBits.Administrator; permName = 'Administrator'; }
            else if (subcommand === 'purge') { reqPerm = PermissionFlagsBits.ManageMessages; permName = 'Manage Messages'; }
            else if (['vmute', 'vunmute'].includes(subcommand)) { reqPerm = PermissionFlagsBits.MuteMembers; permName = 'Mute Members'; }

            if (reqPerm && !context.member.permissions.has(reqPerm)) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', `Kamu tidak memiliki izin \`${permName}\` untuk menggunakan operasi ini.`)] });
            }
        }

        const everyoneRole = context.guild.roles.everyone;

        // --- CASE 1: LOCK ---
        if (subcommand === 'lock') {
            try {
                // Cek status saat ini apakah channel sudah dikunci
                const currentOverwrite = context.channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (currentOverwrite && currentOverwrite.deny.has(PermissionFlagsBits.SendMessages)) {
                    return await sendResponse({ embeds: [embed.error(userExecutor, '🔒 Channel Sudah Terkunci', 'Channel ini sudah dalam kondisi terkunci sebelumnya.')] });
                }

                await context.channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false, AddReactions: false });
                return await sendResponse({ embeds: [embed.success(userExecutor, '🔒 Channel Dikunci', 'Channel ini telah dikunci. Member biasa tidak bisa lagi mengirim pesan ke sini sampai channel ini dibuka kembali.')] });
            } catch (error) {
                return await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mengunci channel. Pastikan bot memiliki izin Manage Channels.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 2: UNLOCK ---
        if (subcommand === 'unlock') {
            try {
                // Cek status saat ini apakah channel sudah terbuka/tidak dikunci
                const currentOverwrite = context.channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (!currentOverwrite || !currentOverwrite.deny.has(PermissionFlagsBits.SendMessages)) {
                    return await sendResponse({ embeds: [embed.error(userExecutor, '🔓 Channel Sudah Terbuka', 'Channel ini sudah dalam kondisi terbuka atau memang tidak sedang dikunci.')] });
                }

                await context.channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null, AddReactions: null });
                return await sendResponse({ embeds: [embed.success(userExecutor, '🔓 Channel Dibuka', 'Kunci channel telah dibuka. Member sekarang dapat berinteraksi kembali seperti biasa.')] });
            } catch (error) {
                return await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal membuka kunci channel.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 3: NUKE ---
        if (subcommand === 'nuke') {
            const channel = context.channel;
            
            if (channel.type !== ChannelType.GuildText) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Operasi Gagal', 'Fitur Nuke hanya dapat diaplikasikan pada teks channel biasa!')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                const newChannel = await channel.clone({ reason: `Nuked oleh ${userExecutor.tag}` });
                await newChannel.setPosition(channel.position);
                await channel.delete().catch(() => null);
                
                return await newChannel.send({
                    embeds: [newChannel.client.helpers?.embed?.success ? newChannel.client.helpers.embed.success(userExecutor, '☢️ CHANNEL NUKED', 'Channel ini telah dihancurkan dan dibuat ulang dari nol.\nSemua riwayat obrolan sebelumnya telah dihapus permanen.') : 
                        new EmbedBuilder().setTitle('☢️ CHANNEL NUKED').setColor('#2ecc71').setDescription('Channel ini telah dihancurkan dan dibuat ulang dari nol.\nSemua riwayat obrolan sebelumnya telah dihapus permanen.').setTimestamp()
                    ]
                });
            } catch (error) {
                logger.error(`[NUKE ERROR] Gagal melakukan nuke di channel ${channel.name}`, error);
                return await context.reply({ content: '❌ Gagal melakukan Nuke. Pastikan posisi hierarki role bot berada di atas dan memiliki izin `Manage Channels`.' }).catch(() => null);
            }
        }

        // --- CASE 4: PURGE ---
        if (subcommand === 'purge') {
            let amount = isInteraction ? context.options.getInteger('jumlah') : (args && args[0] ? parseInt(args[0]) : null);

            if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Jumlah Tidak Valid', 'Tentukan jumlah pesan yang ingin dihapus antara **1 sampai 100**!\nContoh: `!purge 50` atau `!clear 50`')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                if (!isInteraction && context.deletable) await context.delete().catch(() => null);

                const deletedMessages = await context.channel.bulkDelete(amount, true);
                if (deletedMessages.size === 0) {
                    return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Tidak ada pesan yang bisa dihapus. Pesan yang usianya lebih dari 14 hari tidak dapat dihapus secara massal.')], flags: [MessageFlags.Ephemeral] });
                }

                const replyMessage = await sendResponse({ embeds: [embed.success(userExecutor, '🧹 Pembersihan Selesai', `Berhasil menghapus **${deletedMessages.size}** pesan dari channel ini.`)], flags: [MessageFlags.Ephemeral] });
                if (!isInteraction && replyMessage) {
                    setTimeout(() => replyMessage.delete().catch(() => null), 3000);
                }
            } catch (error) {
                logger.error('[PURGE ERROR] Gagal melakukan bulk delete', error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan saat mencoba menghapus pesan. Pastikan bot memiliki izin Manage Messages.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 5: SLOWMODE ---
        if (subcommand === 'slowmode') {
            const time = isInteraction ? context.options.getInteger('detik') : (args && args[0] ? parseInt(args[0]) : null);

            if (time === null || isNaN(time) || time < 0 || time > 21600) {
                return sendResponse({ embeds: [embed.error(userExecutor, 'Angka Tidak Valid', 'Tentukan jumlah jeda waktu dalam detik antara **0 sampai 21600** (6 jam)!\nContoh: `!slowmode 10` atau `!sm 10`')], flags: [MessageFlags.Ephemeral] });
            }

            try {
                await context.channel.setRateLimitPerUser(time, `Diubah oleh ${userExecutor.tag}`);
                if (time === 0) {
                    return await sendResponse({ embeds: [embed.success(userExecutor, 'Slowmode Dimatikan', 'Mode lambat telah dinonaktifkan. Member bisa mengetik tanpa jeda waktu.')] });
                } else {
                    return await sendResponse({ embeds: [embed.success(userExecutor, 'Slowmode Diaktifkan', `Mode lambat berhasil diatur ke **${time} detik**.\nMember harus menunggu ${time} detik sebelum bisa mengirim pesan berikutnya.`)] });
                }
            } catch (error) {
                logger.error(`[SLOWMODE ERROR] Gagal mengatur slowmode di ${context.channel.name}`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal mengatur slowmode. Pastikan bot memiliki izin Manage Channels.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- CASE 6 & 7: VMUTE & VUNMUTE ---
        if (['vmute', 'vunmute'].includes(subcommand)) {
            let targetUser = isInteraction ? context.options.getUser('target') : (context.mentions.users.first() || (args && args[0] ? await client.users.fetch(args[0]).catch(() => null) : null));

            if (!targetUser) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', `Format salah! Gunakan: \`!${subcommand} [@user/ID_User]\``)], flags: [MessageFlags.Ephemeral] });

            const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan.')], flags: [MessageFlags.Ephemeral] });
            if (!targetMember.voice.channel) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', `**${targetUser.tag}** saat ini tidak berada di Voice Channel mana pun.`)], flags: [MessageFlags.Ephemeral] });

            try {
                if (subcommand === 'vmute') {
                    await targetMember.voice.setMute(true, `V-Mute oleh ${userExecutor.tag}`);
                    return await sendResponse({ embeds: [embed.success(userExecutor, '🎙️ Voice Mute', `**${targetUser.tag}** telah dibisukan (Server Muted) di Voice Channel.`)] });
                } else {
                    await targetMember.voice.setMute(false, `V-Unmute oleh ${userExecutor.tag}`);
                    return await sendResponse({ embeds: [embed.success(userExecutor, '🔊 Voice Unmute', `Suara **${targetUser.tag}** telah dipulihkan. Ia kini bisa berbicara lagi di Voice Channel.`)] });
                }
            } catch (error) {
                logger.error(`[VOICE MOD ERROR - ${subcommand.toUpperCase()}] Gagal memproses ${targetUser.tag}`, error);
                return sendResponse({ embeds: [embed.error(userExecutor, 'Error', `Gagal mengeksekusi Voice ${subcommand === 'vmute' ? 'Mute' : 'Unmute'}.`)], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};