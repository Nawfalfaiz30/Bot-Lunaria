const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GiveawayDB = require('../../models/giveawaySchema');
const GuildSettings = require('../../models/guildSchema'); 
const embed = require('../../helpers/embed');

module.exports = {
    name: 'giveaway',
    aliases: ['gstart', 'gcreate', 'gend', 'gstop', 'greroll', 'groll', 'glist', 'giveaways', 'gedit', 'gmodify', 'gdrop', 'drop'],
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Sistem manajemen kontrol dan pembuatan giveaway di server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        
        // Subcommand: Start
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Memulai giveaway baru di server.')
                .addStringOption(opt => opt.setName('durasi').setDescription('Durasi giveaway (contoh: 10m, 2h, 1d)').setRequired(true))
                .addIntegerOption(opt => opt.setName('pemenang').setDescription('Jumlah pemenang').setRequired(true).setMinValue(1))
                .addStringOption(opt => opt.setName('hadiah').setDescription('Hadiah giveaway').setRequired(true))
        )
        
        // Subcommand: End
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('Menghentikan giveaway secara instan dan menentukan pemenang.')
                .addStringOption(opt => opt.setName('message_id').setDescription('ID pesan giveaway').setRequired(true))
        )
        
        // Subcommand: Reroll
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Mengundi ulang pemenang dari giveaway yang sudah berakhir.')
                .addStringOption(opt => opt.setName('message_id').setDescription('ID pesan giveaway').setRequired(true))
        )
        
        // Subcommand: List
        .addSubcommand(sub => sub.setName('list').setDescription('Melihat daftar giveaway yang sedang aktif di server.'))
        
        // Subcommand: Edit
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Mengedit durasi tambahan atau jumlah pemenang giveaway aktif.')
                .addStringOption(opt => opt.setName('message_id').setDescription('ID pesan giveaway').setRequired(true))
                .addIntegerOption(opt => opt.setName('tambah_menit').setDescription('Tambah waktu dalam menit').setRequired(true))
                .addIntegerOption(opt => opt.setName('pemenang').setDescription('Ubah total target pemenang'))
        )
        
        // Subcommand: Drop
        .addSubcommand(sub =>
            sub.setName('drop')
                .setDescription('Membuat mini-giveaway instan sistem rebutan cepat.')
                .addStringOption(opt => opt.setName('hadiah').setDescription('Hadiah drop koin/item').setRequired(true))
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;
        const guildName = context.guild.name.toUpperCase();
        const currentGuildId = context.guild.id; 

        const sendResponse = async (options) => {
            if (!isInteraction && options.ephemeral) delete options.ephemeral;
            if (isInteraction) {
                if (context.deferred || context.replied) return await context.editReply(options);
                return await context.reply(options);
            } else {
                return await context.reply(options);
            }
        };

        // Ambil data konfigurasi Channel A khusus Giveaway dari database setup
        const guildData = await GuildSettings.findOne({ guildId: currentGuildId });
        const giveawayChannelId = guildData ? (guildData.giveawayLogChannel || guildData.logChannel) : null;
        const targetGiveawayChannel = giveawayChannelId ? context.guild.channels.cache.get(giveawayChannelId) : context.channel;

        // 🎲 ALGORITMA GACHA UTAMA: Fisher-Yates Shuffle (Fixed Real-Time Fetch)
        const executeDraw = async (targetMessageId, eventChannel) => {
            const giveaway = await GiveawayDB.findOne({ messageId: targetMessageId, hasEnded: false });
            if (!giveaway) return;

            // Fetch ulang pesan fisik langsung dari Channel A tempat event diadakan
            const msg = await eventChannel.messages.fetch(targetMessageId).catch(() => null);
            if (!msg) return;

            const reaction = msg.reactions.cache.get('🎉');
            const users = reaction ? await reaction.users.fetch({ force: true }) : null;
            const participants = users ? users.filter(u => !u.bot).map(u => u.id) : [];

            giveaway.hasEnded = true;

            if (participants.length === 0) {
                await giveaway.save();
                const noEmbed = new EmbedBuilder()
                    .setAuthor({ name: `${guildName} | GIVEAWAY SELESAI`, iconURL: eventChannel.guild.iconURL({ dynamic: true }) })
                    .setColor('#606266')
                    .setThumbnail(client.user.displayAvatarURL())
                    .setDescription(
                        `📌 **Hadiah:** \`${giveaway.prize}\`\n` +
                        `✨ **Status:** Dibatalkan karena tidak ada partisipan yang bergabung.`
                    );
                await msg.edit({ embeds: [noEmbed] });
                return;
            }

            // Pengocokan Array Peserta (Gacha Sempurna)
            for (let i = participants.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [participants[i], participants[j]] = [participants[j], participants[i]];
            }

            const luckyWinners = [];
            for (let i = 0; i < giveaway.winnersCount; i++) {
                if (participants.length === 0) break;
                luckyWinners.push(participants.pop());
            }

            giveaway.winners = luckyWinners;
            await giveaway.save();

            const winnerMentions = luckyWinners.map(id => `<@${id}>`);

            // Edit panel utama di Channel A menjadi pengumuman hasil akhir[cite: 6]
            const endEmbed = new EmbedBuilder()
                .setAuthor({ name: `${guildName} | RESULT PANEL`, iconURL: eventChannel.guild.iconURL({ dynamic: true }) })
                .setTitle(`🎉 Runtutan Event Selesai!`)
                .setColor('#10B981') // Emerald Green
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(
                    `🎁 **Hadiah Utama:** \`${giveaway.prize}\`\n` +
                    `👥 **Total Entri:** \`${participants.length + luckyWinners.length}\` Pengguna\n\n` +
                    `👑 **PEMENANG SAH:**\n` +
                    `${winnerMentions.map(w => `└─ ${w}`).join('\n')}\n\n` +
                    `📌 *Klaim hadiah dapat diajukan langsung di sini menuju promotor event <@${giveaway.hostId}>.*`
                )
                .setTimestamp();

            await msg.edit({ embeds: [endEmbed] });

            // Kirim notifikasi mention heboh tepat di bawah panel Channel A tersebut
            const announcementEmbed = new EmbedBuilder()
                .setAuthor({ name: `CONGRATULATIONS / SELAMAT`, iconURL: client.user.displayAvatarURL() })
                .setColor('#10B981')
                .setDescription(
                    `Selamat kepada pemenang terpilih yang memenangkan kompetisi berhadiah **${giveaway.prize}**!\n\n` +
                    `🏆 **Daftar Pemenang:**\n${winnerMentions.join(', ')}\n\n` +
                    `✨ *Silahkan Hubungi:* <@${giveaway.hostId}>`
                )
                .setTimestamp();

            await eventChannel.send({ embeds: [announcementEmbed] });
        };

        // --- PARSING SUBCOMMAND ---
        let subcommand = '';
        let finalArgs = [...args]; 

        if (isInteraction) {
            subcommand = context.options.getSubcommand(false) || 'list'; 
        } else {
            const prefixUsed = client.prefix || 'ln';
            const messageContent = context.content.trim();
            const firstWord = messageContent.split(' ')[0].toLowerCase();
            const commandCalled = firstWord.substring(prefixUsed.length).trim();

            if (['gstart', 'gcreate'].includes(commandCalled)) {
                subcommand = 'start';
            } else if (['gend', 'gstop'].includes(commandCalled)) {
                subcommand = 'end';
            } else if (['greroll', 'groll'].includes(commandCalled)) {
                subcommand = 'reroll';
            } else if (['glist', 'giveaways'].includes(commandCalled)) {
                subcommand = 'list';
            } else if (['gedit', 'gmodify'].includes(commandCalled)) {
                subcommand = 'edit';
            } else if (['gdrop', 'drop'].includes(commandCalled)) {
                subcommand = 'drop';
            } else if (commandCalled === 'giveaway' || commandCalled === '') {
                if (finalArgs.length > 0 && ['start', 'end', 'reroll', 'list', 'edit', 'drop'].includes(finalArgs[0].toLowerCase())) {
                    subcommand = finalArgs.shift().toLowerCase();
                } else {
                    subcommand = 'list';
                }
            }
        }

        if (!subcommand) {
            return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Subcommand tidak valid.')], ephemeral: true });
        }

        if (!isInteraction && !context.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return sendResponse({ embeds: [embed.error(userExecutor, 'Akses Ditolak', 'Kamu tidak memiliki izin `Manage Messages`.')] });
        }

        // --- CASE 1: START ---
        if (subcommand === 'start') {
            const durationStr = isInteraction ? context.options.getString('durasi') : finalArgs[0];
            const winnerCount = isInteraction ? context.options.getInteger('pemenang') : parseInt(finalArgs[1]);
            const prize = isInteraction ? context.options.getString('hadiah') : finalArgs.slice(2).join(' ');

            if (!durationStr || !winnerCount || !prize || isNaN(winnerCount)) {
                const formatEmbed = new EmbedBuilder()
                    .setTitle('❌ Format Input Salah')
                    .setColor('#EF4444')
                    .setDescription('Gunakan pola parameter berikut:\n`ln giveaway start <durasi> <jumlah_pemenang> <hadiah>`');
                return sendResponse({ embeds: [formatEmbed], ephemeral: true });
            }

            const timeMatch = durationStr.match(/^(\d+)([mhd])$/);
            if (!timeMatch) {
                const durationErrorEmbed = new EmbedBuilder()
                    .setTitle('❌ Unit Waktu Salah')
                    .setColor('#EF4444')
                    .setDescription('Gunakan ekstensi waktu yang valid: `m` (Menit), `h` (Jam), `d` (Hari)');
                return sendResponse({ embeds: [durationErrorEmbed], ephemeral: true });
            }
            
            const value = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            let durationMs = value * 60 * 1000;
            if (unit === 'h') durationMs = value * 60 * 60 * 1000;
            if (unit === 'd') durationMs = value * 24 * 60 * 60 * 1000;

            const endAt = new Date(Date.now() + durationMs);

            const gEmbed = new EmbedBuilder()
                .setAuthor({ name: `🎁 ${guildName} EVENT GIVEAWAY`, iconURL: context.guild.iconURL({ dynamic: true }) })
                .setTitle(`⚡ ${prize}`)
                .setColor('#F59E0B') // Amber Gold Premium
                .setThumbnail(client.user.displayAvatarURL()) 
                .setDescription(
                    `✨ **Klik tombol emoji 🎉 di bawah untuk berpartisipasi.**\n\n` +
                    `📊 **DETAIL SYARAT PANEL**\n` +
                    `├─ 👥 **Kuota Slot:** \`${winnerCount}\` Pemenang\n` +
                    `└─ ⏳ **Sisa Periode:** Selesai <t:${Math.floor(endAt.getTime() / 1000)}:R>\n`
                )
                .addFields({ name: '👤 Penyelenggara Giveaway', value: `${userExecutor} (\`${userExecutor.username}\`)`, inline: true })
                .setFooter({ text: `Lunaria System Distribution Ecosystem`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp(endAt);

            // FIX UTAMA: Kirim panel utama langsung menuju target Channel A yang telah dikonfigurasi[cite: 7]
            const msg = await targetGiveawayChannel.send({ embeds: [gEmbed] });
            await msg.react('🎉');

            await GiveawayDB.create({
                guildId: currentGuildId,
                channelId: targetGiveawayChannel.id, // ID Channel A disimpan ke database[cite: 7]
                messageId: msg.id,
                hostId: userExecutor.id,
                prize: prize,
                winnersCount: winnerCount,
                endTime: endAt,
                hasEnded: false,
                entries: [],
                winners: []
            });

            setTimeout(async () => {
                await executeDraw(msg.id, targetGiveawayChannel);
            }, durationMs);

            return;
        }

        // --- CASE 2: END ---
        if (subcommand === 'end') {
            const messageId = isInteraction ? context.options.getString('message_id') : finalArgs[0];
            if (!messageId) {
                const missingIdEmbed = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Silakan cantumkan target ID pesan panel!');
                return sendResponse({ embeds: [missingIdEmbed], ephemeral: true });
            }

            const checkGiveaway = await GiveawayDB.findOne({ messageId: messageId, hasEnded: false });
            if (!checkGiveaway) {
                const notFoundEmbed = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Event tidak aktif atau ID salah.');
                return sendResponse({ embeds: [notFoundEmbed], ephemeral: true });
            }

            await executeDraw(messageId, targetGiveawayChannel);
            
            const successForceDraw = new EmbedBuilder().setColor('#10B981').setDescription('✅ Pengundian paksa instan selesai dijalankan.');
            return sendResponse({ embeds: [successForceDraw], ephemeral: true });
        }

        // --- CASE 3: REROLL ---
        if (subcommand === 'reroll') {
            const messageId = isInteraction ? context.options.getString('message_id') : finalArgs[0];
            if (!messageId) {
                const missingRerollEmbed = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Harap sertakan ID pesan undian!');
                return sendResponse({ embeds: [missingRerollEmbed], ephemeral: true });
            }

            const giveaway = await GiveawayDB.findOne({ messageId: messageId });
            if (!giveaway) {
                const dataNotFound = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Log rekam data kosong.');
                return sendResponse({ embeds: [dataNotFound], ephemeral: true });
            }

            // Membuka channel tempat giveaway diadakan (Channel A)[cite: 7]
            const channel = context.guild.channels.cache.get(giveaway.channelId);
            const msg = await channel?.messages.fetch(giveaway.messageId).catch(() => null);
            if (!msg) {
                const msgNotFound = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Pesan fisik di Channel A tidak ditemukan.');
                return sendResponse({ embeds: [msgNotFound], ephemeral: true });
            }

            const reaction = msg.reactions.cache.get('🎉');
            const users = reaction ? await reaction.users.fetch({ force: true }) : null;
            const participants = users ? users.filter(u => !u.bot).map(u => u.id) : [];

            if (participants.length === 0) {
                const emptyPartEmbed = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Partisipan kosong, re-roll gagal.');
                return sendResponse({ embeds: [emptyPartEmbed] });
            }

            for (let i = participants.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [participants[i], participants[j]] = [participants[j], participants[i]];
            }

            const newWinnerId = participants.pop();
            giveaway.winners = [newWinnerId];
            await giveaway.save();

            const rerollEmbed = new EmbedBuilder()
                .setAuthor({ name: `${guildName} | EVENT UPDATES`, iconURL: context.guild.iconURL({ dynamic: true }) })
                .setTitle('🔄 Hasil Re-Roll Acak Baru')
                .setColor('#8B5CF6')
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(
                    `📝 **Hadiah:** \`${giveaway.prize}\`\n` +
                    `👑 **Pemenang Terpilih:** <@${newWinnerId}>\n\n` +
                    `👉 *Silakan konfirmasi hadiah menuju promotor event.*`
                )
                .setTimestamp();

            // Hasil pengundian ulang dikirim ke Channel A[cite: 7]
            await channel.send({ embeds: [rerollEmbed] });
            
            const ackEmbed = new EmbedBuilder().setColor('#10B981').setDescription(`✅ Pembaruan re-roll sukses disiarkan ke saluran <#${channel.id}>.`);
            return sendResponse({ embeds: [ackEmbed], ephemeral: true });
        }

        // --- CASE 4: LIST ---
        if (subcommand === 'list') {
            const activeGiveaways = await GiveawayDB.find({ guildId: currentGuildId, hasEnded: false });
            if (activeGiveaways.length === 0) {
                const emptyListEmbed = new EmbedBuilder().setColor('#3B82F6').setDescription('📋 Tidak ada agenda event giveaway yang sedang berjalan.');
                return sendResponse({ embeds: [emptyListEmbed] });
            }

            const list = activeGiveaways.map((g, i) => {
                return `\`[${i + 1}]\` **${g.prize}**\n└─ Saluran: <#${g.channelId}> • Selesai: <t:${Math.floor(g.endTime.getTime() / 1000)}:R>`;
            }).join('\n\n');

            const listEmbed = new EmbedBuilder()
                .setAuthor({ name: guildName, iconURL: context.guild.iconURL({ dynamic: true }) })
                .setTitle('📋 Daftar Proyek Giveaway Aktif')
                .setColor('#3B82F6')
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(list)
                .setTimestamp();

            return sendResponse({ embeds: [listEmbed] });
        }

        // --- CASE 5: EDIT ---
        if (subcommand === 'edit') {
            const messageId = isInteraction ? context.options.getString('message_id') : finalArgs[0];
            const addMinutes = isInteraction ? context.options.getInteger('tambah_menit') : parseInt(finalArgs[1]);
            const newWinnersCount = isInteraction ? context.options.getInteger('pemenang') : parseInt(finalArgs[2]);

            if (!messageId || isNaN(addMinutes)) {
                const editFormatEmbed = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Pola perintah keliru. Gunakan: `ln giveaway edit <message_id> <tambah_menit>`');
                return sendResponse({ embeds: [editFormatEmbed], ephemeral: true });
            }

            const giveaway = await GiveawayDB.findOne({ messageId: messageId, hasEnded: false });
            if (!giveaway) {
                const noActiveGv = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Target data event tidak ditemukan.');
                return sendResponse({ embeds: [noActiveGv], ephemeral: true });
            }

            giveaway.endTime = new Date(giveaway.endTime.getTime() + (addMinutes * 60 * 1000));
            if (newWinnersCount && !isNaN(newWinnersCount)) giveaway.winnersCount = newWinnersCount;

            await giveaway.save();
            
            const channel = context.guild.channels.cache.get(giveaway.channelId);
            const msg = await channel?.messages.fetch(giveaway.messageId).catch(() => null);
            if (msg && msg.embeds.length > 0) {
                const oldEmbed = EmbedBuilder.from(msg.embeds[0]);
                oldEmbed.setDescription(
                    `✨ **Klik tombol emoji 🎉 di bawah untuk berpartisipasi.**\n\n` +
                    `📊 **DETAIL KETENTUAN GIVEAWAY**\n` +
                    `├─ 👥 **Kuota Slot:** \`${giveaway.winnersCount}\` Pemenang\n` +
                    `└─ ⏳ **Sisa Waktu:** Selesai <t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R> (Telah Diperpanjang)\n`
                );
                oldEmbed.setTimestamp(giveaway.endTime);
                await msg.edit({ embeds: [oldEmbed] }).catch(() => null);
            }

            const editSuccess = new EmbedBuilder().setColor('#10B981').setDescription(`✅ Penyesuaian data tuntas. Durasi diperbarui di channel <#${giveaway.channelId}>.`);
            return sendResponse({ embeds: [editSuccess] });
        }

        // --- CASE 6: DROP ---
        if (subcommand === 'drop') {
            const prize = isInteraction ? context.options.getString('hadiah') : finalArgs.join(' ');
            if (!prize) {
                const noDropPrize = new EmbedBuilder().setColor('#EF4444').setDescription('❌ Spesifikasi objek item drop wajib diisi!');
                return sendResponse({ embeds: [noDropPrize], ephemeral: true });
            }

            const dropEmbed = new EmbedBuilder()
                .setAuthor({ name: `⚡ ${guildName} GIVEAWAY INSTANT`, iconURL: context.guild.iconURL({ dynamic: true }) })
                .setTitle('🎁 Amankan Hadiah Drop!')
                .setColor('#F97316') // Neon Orange
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(
                    `🔥 **Klaim hadiah sekarang sebelum didahului member lain!**\n\n` +
                    `💝 **Hadiah:** \`${prize}\``
                )
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_gdrop').setLabel('🎁 AMBIL SEKARANG').setStyle(ButtonStyle.Success)
            );

            // Perintah drop mini-rebutan juga otomatis dilempar langsung ke Channel A[cite: 7]
            const msg = await targetGiveawayChannel.send({ embeds: [dropEmbed], components: [row] });
            
            const collector = msg.createMessageComponentCollector({ time: 600000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'claim_gdrop') {
                    row.components[0].setDisabled(true).setLabel('❌ AMUNISI DROP HABIS');
                    const winEmbed = new EmbedBuilder()
                        .setAuthor({ name: `⚡ ${guildName} DROP SELESAI`, iconURL: context.guild.iconURL({ dynamic: true }) })
                        .setTitle('🎉 Looting Berhasil!')
                        .setColor('#10B981')
                        .setThumbnail(client.user.displayAvatarURL())
                        .setDescription(
                            `👑 **Pemenang Tercepat:** ${interaction.user}\n` +
                            `🎁 **Hadiah Diklaim:** \`${prize}\`.`
                        )
                        .setTimestamp();
                    await interaction.update({ embeds: [winEmbed], components: [row] });
                    collector.stop('claimed');
                }
            });
            return;
        }
    }
};