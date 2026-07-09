const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const MabarDB = require('../../models/mabarSessionSchema');
const ProfileDB = require('../../models/playerProfileSchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'mabar',
    aliases: [
        'ajak', 'main', 'mabarkuy',
        'bubar', 'closemabar', 'cancelmabar', 'stopmabar',
        'party', 'cekparty', 'listmabar', 'members',
        'profile', 'gamingprofile', 'pgr',
        'schedule', 'jadwal', 'setjadwal',
        'setprofile', 'setp', 'setprofilegaming', 'gantiprofile',
        'stats', 'mabarstats', 'mystats'
    ],
    data: new SlashCommandBuilder()
        .setName('mabar')
        .setDescription('Sistem Manajemen Mabar (Main Bareng) Lunaria')
        .addSubcommand(sub =>
            sub.setName('ajak')
                .setDescription('Membuka sesi Mabar baru.')
                .addStringOption(opt => opt.setName('game').setDescription('Nama game yang ingin dimainkan').setRequired(true))
                .addIntegerOption(opt => opt.setName('slot').setDescription('Jumlah orang yang dicari (1-10)').setRequired(true).setMinValue(1).setMaxValue(10))
        )
        .addSubcommand(sub =>
            sub.setName('bubar')
                .setDescription('Menutup dan membubarkan sesi Mabar Anda yang sedang aktif.')
        )
        .addSubcommand(sub =>
            sub.setName('party')
                .setDescription('Melihat siapa saja yang ada di dalam sesi Mabar Anda saat ini.')
        )
        .addSubcommand(sub =>
            sub.setName('profile')
                .setDescription('Melihat profil gaming Anda atau member lain.')
                .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dilihat profilnya'))
        )
        .addSubcommand(sub =>
            sub.setName('schedule')
                .setDescription('Mengumumkan jadwal mabar.')
                .addStringOption(opt => opt.setName('waktu').setDescription('Contoh: Besok jam 19.00 WIB').setRequired(true))
                .addStringOption(opt => opt.setName('game').setDescription('Game yang dimainkan').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('setprofile')
                .setDescription('Mengatur profil gaming Anda.')
                .addStringOption(opt => opt.setName('ign').setDescription('In-Game Name (Nick Game)').setRequired(true))
                .addStringOption(opt => opt.setName('game').setDescription('Game favorit Anda').setRequired(true))
                .addStringOption(opt => opt.setName('platform').setDescription('Platform (PC/Mobile/PS/Xbox)').setRequired(true))
                .addStringOption(opt => opt.setName('rank').setDescription('Rank saat ini').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('Melihat statistik mabar Anda.')
        ),

    async execute(context, args = [], client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction) delete options.flags;
            return await context.reply(options);
        };

        let action;
        let commandArgs = [...args]; 

        if (isInteraction) {
            action = context.options.getSubcommand();
        } else {
            // DETEKSI PREFIX SECARA DINAMIS
            const words = context.content.trim().split(/ +/);
            
            // Mengambil kata pertama (bisa berisi prefix + nama command, contoh: "lnmabar" atau "ln")
            let firstWord = words[0].toLowerCase();
            
            // Tentukan list trigger yang valid
            const mainTriggers = ['mabar', ...this.aliases];
            
            // Cari kata pemicu di dalam string kata pertama
            let cmdTrigger = '';
            for (const trigger of mainTriggers) {
                if (firstWord.endsWith(trigger)) {
                    cmdTrigger = trigger;
                    break;
                }
            }

            // Jika mengetik langsung aliasnya (misal: lnajak, lnmain, lnbubar)
            if (['ajak', 'main', 'mabarkuy'].includes(cmdTrigger)) action = 'ajak';
            else if (['bubar', 'closemabar', 'cancelmabar', 'stopmabar'].includes(cmdTrigger)) action = 'bubar';
            else if (['party', 'cekparty', 'listmabar', 'members'].includes(cmdTrigger)) action = 'party';
            else if (['profile', 'gamingprofile', 'pgr'].includes(cmdTrigger)) action = 'profile';
            else if (['schedule', 'jadwal', 'setjadwal'].includes(cmdTrigger)) action = 'schedule';
            else if (['setprofile', 'setp', 'setprofilegaming', 'gantiprofile'].includes(cmdTrigger)) action = 'setprofile';
            else if (['stats', 'mabarstats', 'mystats'].includes(cmdTrigger)) action = 'stats';
            
            // Jika menggunakan command utama: ln mabar [subcommand] (misal: ln mabar ajak mlbb 4)
            if (cmdTrigger === 'mabar' && commandArgs.length > 0) {
                const subFirst = commandArgs[0].toLowerCase();
                if (['ajak', 'main', 'mabarkuy'].includes(subFirst)) { action = 'ajak'; commandArgs.shift(); }
                else if (['bubar', 'closemabar', 'cancelmabar', 'stopmabar'].includes(subFirst)) { action = 'bubar'; commandArgs.shift(); }
                else if (['party', 'cekparty', 'listmabar', 'members'].includes(subFirst)) { action = 'party'; commandArgs.shift(); }
                else if (['profile', 'gamingprofile', 'pgr'].includes(subFirst)) { action = 'profile'; commandArgs.shift(); }
                else if (['schedule', 'jadwal', 'setjadwal'].includes(subFirst)) { action = 'schedule'; commandArgs.shift(); }
                else if (['setprofile', 'setp', 'setprofilegaming', 'gantiprofile'].includes(subFirst)) { action = 'setprofile'; commandArgs.shift(); }
                else if (['stats', 'mabarstats', 'mystats'].includes(subFirst)) { action = 'stats'; commandArgs.shift(); }
            }
        }

        if (!action) {
            if (!isInteraction) {
                return context.reply({ content: '❌ Perintah tidak dikenali. Gunakan: `ln mabar [ajak/bubar/party/profile/schedule/setprofile/stats]`' });
            }
            return;
        }

        // ==========================================
        // FILTRASI LOGIK INPUT & EKSEKUSI MODUL
        // ==========================================
        
        // 1. MODUL: AJAK MABAR
        if (action === 'ajak') {
            let game, slot;
            if (isInteraction) {
                game = context.options.getString('game');
                slot = context.options.getInteger('slot');
            } else {
                if (!commandArgs || commandArgs.length < 2) {
                    return context.reply({ content: '❌ Format salah! Gunakan: `ln mabar ajak [Nama Game] [Jumlah Slot]`\nContoh: `ln mabar ajak Mobile Legends 4`' });
                }
                slot = parseInt(commandArgs[commandArgs.length - 1]);
                if (isNaN(slot) || slot < 1 || slot > 10) {
                    return context.reply({ content: '❌ Angka jumlah slot harus diletakkan di paling akhir perintah (antara 1 - 10)!\nContoh: `ln mabar ajak Valorant 4`' });
                }
                game = commandArgs.slice(0, -1).join(' ');
            }

            try {
                const existingSession = await MabarDB.findOne({ hostId: userExecutor.id, guildId: context.guild.id });
                if (existingSession) {
                    const errEmbed = [embed.error(userExecutor, 'Sesi Sedang Berjalan', 'Anda sudah memiliki sesi mabar yang aktif!')];
                    return isInteraction ? context.reply({ embeds: errEmbed, flags: [MessageFlags.Ephemeral] }) : context.reply({ embeds: errEmbed });
                }

                const mabarEmbed = new EmbedBuilder()
                    .setTitle(`🎮 Sesi Mabar Baru: ${game}`)
                    .setColor('#3498db')
                    .setDescription(`**Host:** <@${userExecutor.id}>\n**Game:** ${game}\n**Slot Dicari:** ${slot} Orang`)
                    .setFooter({ text: 'Klik tombol di bawah ini jika ingin ikut bergabung!' });

                const btnJoin = new ButtonBuilder().setCustomId('mabar_join').setLabel('Ikut Mabar').setStyle(ButtonStyle.Success).setEmoji('🎮');
                const btnLeave = new ButtonBuilder().setCustomId('mabar_leave').setLabel('Batal Ikut').setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder().addComponents(btnJoin, btnLeave);

                await context.reply({ content: '@here Ada yang ngajak mabar nih!', embeds: [mabarEmbed], components: [row] });
                const message = isInteraction ? await context.fetchReply() : await context.channel.messages.fetch({ limit: 1 }).then(m => m.first());

                const newSession = new MabarDB({
                    guildId: context.guild.id,
                    hostId: userExecutor.id,
                    gameName: game,
                    maxPlayers: slot + 1,
                    players: [userExecutor.id],
                    channelId: context.channel.id,
                    messageId: message.id
                });
                await newSession.save();
            } catch (error) {
                logger.error(`[AJAK ERROR] Gagal membuat sesi mabar oleh ${userExecutor.tag}`, error);
                const errSys = [embed.error(userExecutor, 'Error', 'Terjadi kesalahan sistem saat membuat sesi mabar.')];
                return isInteraction ? context.reply({ embeds: errSys, flags: [MessageFlags.Ephemeral] }) : context.reply({ embeds: errSys });
            }
        }

        // 2. MODUL: BUBAR MABAR
        else if (action === 'bubar') {
            try {
                const session = await MabarDB.findOne({ hostId: userExecutor.id, guildId: context.guild.id });
                if (!session) {
                    return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Anda tidak memiliki sesi mabar yang aktif saat ini.')], flags: [MessageFlags.Ephemeral] });
                }

                await MabarDB.findOneAndDelete({ hostId: userExecutor.id, guildId: context.guild.id });

                try {
                    const channel = await context.guild.channels.fetch(session.channelId);
                    if (channel) {
                        const originalMessage = await channel.messages.fetch(session.messageId);
                        if (originalMessage) {
                            const originalEmbed = originalMessage.embeds[0];
                            const disabledRow = ActionRowBuilder.from(originalMessage.components[0]);
                            disabledRow.components.forEach(btn => btn.setDisabled(true));

                            await originalMessage.edit({ 
                                content: `~~${originalMessage.content}~~ (Mabar telah dibubarkan)`,
                                embeds: [originalEmbed], 
                                components: [disabledRow] 
                            });
                        }
                    }
                } catch (err) {
                    logger.error(`[BUBAR] Pesan ajakan asli tidak ditemukan atau gagal diedit.`);
                }

                await sendResponse({ embeds: [embed.success(userExecutor, 'Mabar Bubar', `Sesi mabar **${session.gameName}** telah berhasil ditutup dan dibubarkan.`)] });
            } catch (error) {
                logger.error(`[BUBAR ERROR] Gagal membubarkan mabar oleh ${userExecutor.tag}`, error);
                await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal membubarkan sesi mabar dari database.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // 3. MODUL: CEK PARTY MEMBERS
        else if (action === 'party') {
            try {
                const session = await MabarDB.findOne({ hostId: userExecutor.id, guildId: context.guild.id });
                if (!session) {
                    return sendResponse({ 
                        embeds: [embed.error(userExecutor, 'Tidak Ada Sesi', `Anda sedang tidak memiliki sesi mabar yang aktif. Buat dulu dengan \`${isInteraction ? '/mabar ajak' : 'ln mabar ajak'}\`.`)], 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                let playerList = '';
                session.players.forEach((playerId, index) => {
                    playerList += `${index + 1}. <@${playerId}> ${playerId === userExecutor.id ? '👑 (Host)' : ''}\n`;
                });

                const partyEmbed = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setTitle(`👥 Party Mabar: ${session.gameName}`)
                    .addFields(
                        { name: 'Kapasitas', value: `${session.players.length} / ${session.maxPlayers} Orang`, inline: true },
                        { name: 'Daftar Anggota', value: playerList, inline: false }
                    )
                    .setFooter({ text: `Gunakan ${isInteraction ? '/mabar bubar' : 'ln mabar bubar'} jika ingin menutup room party ini.` });

                await sendResponse({ embeds: [partyEmbed] });
            } catch (error) {
                logger.error(`[PARTY ERROR] Gagal mengecek party ${userExecutor.tag}`, error);
                await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Terjadi kesalahan saat memuat status party.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // 4. MODUL: LIHAT PROFIL GAMING
        else if (action === 'profile') {
            let target;
            if (isInteraction) {
                target = context.options.getUser('target') || context.user;
            } else {
                target = context.mentions.users.first() || (commandArgs && commandArgs[0] ? await client.users.fetch(commandArgs[0]).catch(() => null) : null) || context.author;
            }

            try {
                const profile = await ProfileDB.findOne({ userId: target.id });
                if (!profile) {
                    return sendResponse({ content: `❌ ${target.id === userExecutor.id ? 'Anda' : 'User tersebut'} belum mengatur profil gaming mereka.`, flags: [MessageFlags.Ephemeral] });
                }

                const profileEmbed = new EmbedBuilder()
                    .setTitle(`Profil Gaming: ${target.username}`)
                    .setColor('#9b59b6')
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '🎮 IGN / Nick', value: profile.ign || '-', inline: true },
                        { name: '⭐ Game Favorit', value: profile.favoriteGame || '-', inline: true },
                        { name: '💻 Platform', value: profile.platform || '-', inline: true },
                        { name: '🏆 Rank Saat Ini', value: profile.rank || '-', inline: true }
                    );

                await sendResponse({ embeds: [profileEmbed] });
            } catch (error) {
                await sendResponse({ content: 'Gagal memuat profil gaming dari database.', flags: [MessageFlags.Ephemeral] });
            }
        }

        // 5. MODUL: JADWAL MABAR
        else if (action === 'schedule') {
            let waktu, game;
            if (isInteraction) {
                waktu = context.options.getString('waktu');
                game = context.options.getString('game');
            } else {
                const joinedArgs = commandArgs.join(' ');
                const splitArgs = joinedArgs.split('|');
                if (splitArgs.length < 2) {
                    return context.reply({ content: '❌ Format salah! Gunakan tanda garis tegak `|` sebagai pemisah.\nFormat: `ln mabar schedule [Nama Game] | [Waktu]`' });
                }
                game = splitArgs[0].trim();
                waktu = splitArgs[1].trim();
            }

            await context.reply({
                content: `📢 **JADWAL MABAR**\n\nGame: **${game}**\nWaktu: **${waktu}**\n\nSiapkan diri kalian, catat waktunya ya!`,
                allowedMentions: { parse: ['everyone'] }
            });
        }

        // 6. MODUL: SET PROFIL GAMING
        else if (action === 'setprofile') {
            let ign, game, platform, rank;
            if (isInteraction) {
                ign = context.options.getString('ign');
                game = context.options.getString('game');
                platform = context.options.getString('platform');
                rank = context.options.getString('rank');
            } else {
                const joinedArgs = commandArgs.join(' ');
                const splitArgs = joinedArgs.split('|');
                if (splitArgs.length < 4) {
                    return sendResponse({ 
                        embeds: [embed.error(userExecutor, 'Format Salah', 'Gunakan tanda pembatas `|` untuk memisahkan 4 kolom data.\nFormat: `ln mabar setprofile [IGN] | [Game] | [Platform] | [Rank]`')],
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
                ign = splitArgs[0].trim();
                game = splitArgs[1].trim();
                platform = splitArgs[2].trim();
                rank = splitArgs[3].trim();
            }

            try {
                await ProfileDB.findOneAndUpdate(
                    { userId: userExecutor.id },
                    { ign, favoriteGame: game, platform, rank },
                    { upsert: true, new: true }
                );
                await sendResponse({ embeds: [embed.success(userExecutor, 'Profil Diperbarui', 'Profil gaming Anda berhasil disimpan!')], flags: [MessageFlags.Ephemeral] });
            } catch (error) {
                await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal menyimpan data profil ke database.')], flags: [MessageFlags.Ephemeral] });
            }
        }

        // 7. MODUL: STATISTIK MABAR
        else if (action === 'stats') {
            try {
                const profile = await ProfileDB.findOne({ userId: userExecutor.id });
                const stats = profile || { totalHosted: 0, totalJoined: 0 };

                const statsEmbed = new EmbedBuilder()
                    .setTitle(`Statistik Mabar: ${userExecutor.username}`)
                    .setColor('#2ecc71')
                    .setThumbnail(userExecutor.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '👑 Total Menjadi Host', value: `**${stats.totalHosted || 0}** Kali`, inline: true },
                        { name: '🎮 Total Ikut Mabar', value: `**${stats.totalJoined || 0}** Kali`, inline: true }
                    );

                await sendResponse({ embeds: [statsEmbed] });
            } catch (error) {
                await sendResponse({ content: 'Gagal memuat statistik mabar dari database.', flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};