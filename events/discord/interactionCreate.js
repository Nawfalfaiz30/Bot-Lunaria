// D:\Lunaria_New 2\events\discord\interactionCreate.js
const { 
    ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, EmbedBuilder,
    ThreadAutoArchiveDuration, MessageFlags
} = require('discord.js');
const logger = require('../../helpers/logger');
const embed = require('../../helpers/embed');

// Import Model Database Lunaria
const GuildSettings = require('../../models/guildSchema');
const TicketDB = require('../../models/ticketSchema');
const ConfessBanDB = require('../../models/confessBanSchema');
const SecurityDB = require('../../models/securitySchema'); // Integrasi model keamanan
const MabarDB = require('../../models/mabarSessionSchema'); // Tambahan model Mabar

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        const userExecutor = interaction.user;
        const guild = interaction.guild;

        if (!guild) return;

        // Fungsi pembantu universal untuk menangani error interaksi secara aman (Anti-Crash 40060/10062)
        const safeErrorResponse = async (error, customMessage = 'Sistemku sedikit bermasalah saat memproses interaksi ini.') => {
            logger.error(`[INTERACTION ERROR HANDLER]`, error);
            const errorEmbed = embed.error(userExecutor, 'Terjadi Kesalahan', customMessage);
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
                }
            } catch (failToReplyError) {
                logger.error('[CRITICAL] Gagal mengirimkan pesan pemberitahuan error ke pengguna:', failToReplyError);
            }
        };

        // ==========================================
        // 1. PENANGANAN SLASH COMMANDS (/perintah)
        // ==========================================
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) {
                logger.warn(`Slash command tidak ditemukan: ${interaction.commandName}`);
                return interaction.reply({ content: 'Perintah ini sudah usang atau tidak ditemukan!', flags: [MessageFlags.Ephemeral] });
            }

            try {
                // Menyisipkan [] agar susunan parameter menjadi (context, args, client)
                await command.execute(interaction, [], client);
            } catch (error) {
                await safeErrorResponse(error, 'Sistemku sedikit bermasalah saat memproses perintah ini.');
            }
        }

        // ==========================================
        // 2. PENANGANAN INTERAKSI TOMBOL (BUTTONS)
        // ==========================================
        else if (interaction.isButton()) {
            const { customId, message } = interaction;

            try {
                // ------------------------------------------
                // 🎮 [SISTEM MABAR]: PROSES GABUNG & BATAL MABAR
                // ------------------------------------------
                if (customId === 'mabar_join' || customId === 'mabar_leave') {
                    // Langsung kunci interaksi agar tidak memicu "Interaction Failed"
                    await interaction.deferUpdate();

                    // Cari sesi mabar aktif di database berdasarkan ID pesan tempat tombol berada
                    const session = await MabarDB.findOne({ messageId: message.id, guildId: guild.id });
                    if (!session) return; 

                    if (customId === 'mabar_join') {
                        // Gabung ke party jika belum terdaftar DAN slot masih tersedia
                        if (!session.players.includes(userExecutor.id) && session.players.length < session.maxPlayers) {
                            session.players.push(userExecutor.id);
                            await session.save();
                        }
                    } else if (customId === 'mabar_leave') {
                        // Keluar dari party (Host tidak boleh keluar lewat tombol, harus pakai /mabar bubar atau !bubar)
                        if (session.players.includes(userExecutor.id) && session.hostId !== userExecutor.id) {
                            session.players = session.players.filter(id => id !== userExecutor.id);
                            await session.save();
                        }
                    }

                    // Perbarui tampilan Embed pesan mabar secara real-time
                    const originalEmbed = EmbedBuilder.from(message.embeds[0]);
                    
                    // Buat ulang daftar mention player terbaru
                    const playerMentions = session.players.map((id, index) => {
                        return `${index + 1}. <@${id}> ${id === session.hostId ? '👑 (Host)' : ''}`;
                    }).join('\n');

                    // Update deskripsi embed dengan daftar party yang baru
                    originalEmbed.setDescription(
                        `**Host:** <@${session.hostId}>\n` +
                        `**Game:** ${session.gameName}\n` +
                        `**Slot Dicari:** ${session.maxPlayers - 1} Orang\n\n` +
                        `**👥 Anggota Party (${session.players.length}/${session.maxPlayers}):**\n${playerMentions}`
                    );

                    // Edit pesan asli agar tombolnya sinkron dengan database
                    return await message.edit({ embeds: [originalEmbed] });
                }

                // ------------------------------------------
                // 🛡️ [SISTEM VERIFIKASI]: PROSES AKTIVASI ROLE MEMBER
                // ------------------------------------------
                else if (customId === 'verify_member_btn') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                    const securityData = await SecurityDB.findOne({ guildId: guild.id });
                    
                    if (!securityData || !securityData.verifiedRole) {
                        return await interaction.editReply({ 
                            content: '❌ **Sistem Error:** Konfigurasi role verifikasi untuk server ini belum disetup oleh Administrator!' 
                        });
                    }

                    const roleIdTarget = securityData.verifiedRole;
                    const targetRoleObject = guild.roles.cache.get(roleIdTarget);

                    if (!targetRoleObject) {
                        return await interaction.editReply({ 
                            content: '❌ **Sistem Error:** Role target verifikasi tidak ditemukan di server ini. Kemungkinan role telah dihapus.' 
                        });
                    }

                    // Validasi kepemilikan role saat ini
                    if (interaction.member.roles.cache.has(roleIdTarget)) {
                        return await interaction.editReply({ 
                            content: 'ℹ️ Akun Anda sudah terverifikasi sebelumnya! Anda sudah memiliki akses penuh ke server ini.' 
                        });
                    }

                    // Eksekusi pemberian role menuju Discord API Gateway
                    await interaction.member.roles.add(roleIdTarget);
                    
                    return await interaction.editReply({ 
                        content: `🎉 **Verifikasi Berhasil! Selamat bergabung!` 
                    });
                }

                // ------------------------------------------
                // 🎫 [SISTEM TICKET]: PEMBUATAN TIKET BARU
                // ------------------------------------------
                else if (customId === 'ticket_create') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                    const guildData = await GuildSettings.findOne({ guildId: guild.id });
                    if (!guildData || !guildData.ticketCategory) {
                        return interaction.editReply({ content: '❌ Kategori pembuatan tiket belum disetup! Harap hubungi Administrator.' });
                    }

                    const existingTicket = await TicketDB.findOne({ guildId: guild.id, userId: userExecutor.id, closed: false });
                    if (existingTicket) {
                        return interaction.editReply({ content: `❌ Kamu sudah memiliki tiket aktif di channel <#${existingTicket.channelId}>!` });
                    }

                    const totalTickets = await TicketDB.countDocuments({ guildId: guild.id });
                    const ticketNumber = String(totalTickets + 1).padStart(4, '0');

                    const permissionOverwrites = [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { 
                            id: userExecutor.id, 
                            allow: [
                                PermissionFlagsBits.ViewChannel, 
                                PermissionFlagsBits.SendMessages, 
                                PermissionFlagsBits.AddReactions, 
                                PermissionFlagsBits.AttachFiles
                            ] 
                        },
                        { 
                            id: client.user.id, 
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] 
                        }
                    ];

                    if (guildData.ticketSupportRole) {
                        permissionOverwrites.push({
                            id: guildData.ticketSupportRole,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                        });
                    }

                    const ticketChannel = await guild.channels.create({
                        name: `ticket-${ticketNumber}`,
                        type: ChannelType.GuildText,
                        parent: guildData.ticketCategory,
                        permissionOverwrites: permissionOverwrites,
                        reason: `Tiket #${ticketNumber} dibuka oleh ${userExecutor.tag}`
                    });

                    await TicketDB.create({
                        guildId: guild.id,
                        channelId: ticketChannel.id,
                        userId: userExecutor.id,
                        ticketId: ticketNumber,
                        closed: false
                    });

                    const welcomeTicketEmbed = new EmbedBuilder()
                        .setTitle(`🎫 TIKET DIBUKA #${ticketNumber}`)
                        .setColor('#3498db')
                        .setDescription(`Halo ${userExecutor}, selamat datang di pusat bantuan server!\nStaf pendukung kami akan segera merespons kendalamu. Mohon berikan detail masalah dengan jelas.\n\n🔒 *Hanya Admin/Staf dan kamu yang bisa mengakses area ini.*`)
                        .setTimestamp();

                    const controlRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_close_direct').setLabel('🔒 Tutup Tiket').setStyle(ButtonStyle.Danger)
                    );

                    const supportPing = guildData.ticketSupportRole ? `<@&${guildData.ticketSupportRole}>` : `@here`;

                    await ticketChannel.send({ content: `${userExecutor} | ${supportPing}`, embeds: [welcomeTicketEmbed], components: [controlRow] });
                    return await interaction.editReply({ content: `✅ Tiket berhasil dibuat! Silakan menuju saluran bantuan: ${ticketChannel}` });
                }

                // ------------------------------------------
                // 🪓 [SISTEM TICKET]: EKSEKUSI PENUTUPAN LANGSUNG & TRANSCRIPT OTOMATIS
                // ------------------------------------------
                else if (customId === 'ticket_close_direct') {
                    await interaction.deferReply(); 

                    const guildData = await GuildSettings.findOne({ guildId: guild.id });
                    
                    const isStaff = guildData && guildData.ticketSupportRole ? interaction.member.roles.cache.has(guildData.ticketSupportRole) : false;
                    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

                    if (!isAdmin && !isStaff) {
                        return interaction.editReply({ content: '❌ Hanya Staf Pengurus atau Administrator dengan izin khusus yang dapat menutup tiket ini!' });
                    }

                    // Mencari data tiket berdasarkan channelId saat ini
                    const ticketData = await TicketDB.findOne({ channelId: interaction.channel.id });
                    
                    // Fallback ekstra: Ambil nomor tiket dari nama channel jika record DB terkendala
                    let ticketNumberString = '0000';
                    if (ticketData && ticketData.ticketId) {
                        ticketNumberString = ticketData.ticketId;
                        ticketData.closed = true;
                        await ticketData.save();
                    } else if (interaction.channel.name.includes('-')) {
                        const parts = interaction.channel.name.split('-');
                        const potentialNum = parts[parts.length - 1];
                        if (!isNaN(potentialNum)) ticketNumberString = potentialNum;
                    }

                    // --- PROSES TRANSCRIPT OTOMATIS KE LOG ---
                    try {
                        const discordTranscripts = require('discord-html-transcripts');
                        const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                            limit: -1,
                            fileName: `transcript-ticket-${ticketNumberString}.html`,
                            returnType: 'attachment'
                        });

                        const logChannelId = guildData?.ticketLogChannel || guildData?.logChannel;
                        if (logChannelId) {
                            const logChan = guild.channels.cache.get(logChannelId);
                            if (logChan) {
                                const logEmbed = new EmbedBuilder()
                                    .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                                    .setTitle('📜 Tiket Ditutup & Transcript Otomatis Terkirim')
                                    .setColor('#e63946')
                                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                                    .addFields(
                                        { name: '🆔 ID Tiket', value: `\`#${ticketNumberString}\``, inline: true },
                                        { name: '👤 Ditutup Oleh', value: `${userExecutor}\n\`${userExecutor.username}\``, inline: true },
                                        { name: '⏰ Waktu Selesai', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                                    )
                                    .setFooter({ text: `${guild.name} Ticket System Log` })
                                    .setTimestamp();

                                // Dikirim terpisah dan dibungkus safe-catch agar kegagalan log tidak memblokir penghapusan channel
                                await logChan.send({ embeds: [logEmbed] }).catch(() => null);
                                await logChan.send({ files: [attachment] }).catch(() => null);
                            }
                        }
                    } catch (transcriptError) {
                        logger.error('[TRANSCRIPT AUTOMATIC ERROR] Gagal memproses transcript otomatis:', transcriptError);
                    }

                    // Informasikan penutupan ke channel
                    await interaction.editReply({ content: '🔒 *Tiket telah ditutup. Saluran ini akan dihancurkan otomatis dalam 5 detik...*' });
                    
                    // Eksekusi penghapusan channel dipastikan berjalan secara independen
                    setTimeout(async () => {
                        await interaction.channel.delete().catch((err) => {
                            logger.error('[CHANNEL DELETE ERROR] Gagal menghapus channel tiket:', err);
                        });
                    }, 5000);
                }

                // ------------------------------------------
                // 💌 [SISTEM CONFESS]: PEMICU MODAL (CHANNEL A)
                // ------------------------------------------
                else if (customId === 'confess_create') {
                    const isBanned = await ConfessBanDB.findOne({ userId: userExecutor.id, guildId: guild.id });
                    if (isBanned) {
                        return interaction.reply({ content: '❌ Hak akses penggunaan sistem confess kamu dicabut oleh Administrator server.', flags: [MessageFlags.Ephemeral] });
                    }

                    const modal = new ModalBuilder().setCustomId('modal_confess_submit').setTitle('Tulis Confess Rahasiamu');
                    const confessInput = new TextInputBuilder()
                        .setCustomId('confess_message')
                        .setLabel('Pesan Ungkapan Rahasia')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Tulis pesan rahasia, kekaguman, atau curhatan anonimmu di sini...')
                        .setMinLength(10)
                        .setMaxLength(1200)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(confessInput));
                    await interaction.showModal(modal);
                }

            } catch (err) {
                await safeErrorResponse(err, 'Terjadi kegagalan sistem saat memproses tombol navigasi.');
            }
        }

        // ==========================================
        // 3. PENANGANAN FORMULIR POP-UP (MODALS)
        // ==========================================
        else if (interaction.isModalSubmit()) {
            const { customId } = interaction;

            try {
                // ------------------------------------------
                // ✉️ [SISTEM CONFESS]: SUBMIT LANGSUNG (ANTI-FAILED)
                // ------------------------------------------
                if (customId === 'modal_confess_submit') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const confessText = interaction.fields.getTextInputValue('confess_message');

                    const guildData = await GuildSettings.findOne({ guildId: guild.id });
                    if (!guildData || !guildData.confessChannel) {
                        return interaction.editReply({ content: '❌ Saluran penyiaran publik untuk confess (`confessChannel`/Channel B) belum ditentukan!' });
                    }

                    const destChannel = guild.channels.cache.get(guildData.confessChannel); 
                    if (!destChannel) {
                        return interaction.editReply({ content: '❌ Saluran tujuan publik (`confessChannel`) tidak ditemukan di server!' });
                    }

                    const publicConfessEmbed = new EmbedBuilder()
                        .setAuthor({ 
                            name: '📩 Surat Rahasia Baru', 
                            iconURL: 'https://abs.twimg.com/emoji/v2/72x72/2728.png'
                        })
                        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                        .setColor('#9b5de5')
                        .setDescription(`## ${confessText}`)
                        .setFooter({ 
                            text: '🔒 Identitas Terjamin 100% Anonim', 
                            iconURL: client.user.displayAvatarURL() 
                        })
                        .setTimestamp();

                    const publicMessage = await destChannel.send({ embeds: [publicConfessEmbed] });

                    try {
                        const botPermissions = destChannel.permissionsFor(client.user);
                        if (botPermissions && botPermissions.has(PermissionFlagsBits.CreatePublicThreads)) {
                            
                            const cleanThreadName = confessText.replace(/[\n\r]+/g, ' '); 
                            const threadTitle = cleanThreadName.length > 60 
                                ? `💬 ${cleanThreadName.substring(0, 57)}...` 
                                : `💬 ${cleanThreadName}`;

                            await publicMessage.channel.threads.create({
                                name: threadTitle,
                                startMessage: publicMessage, 
                                autoArchiveDuration: ThreadAutoArchiveDuration.OneDay, 
                                reason: 'Ruang tanggapan otomatis confess'
                            });
                        } else {
                            logger.warn(`[CONFESS THREAD] Bot tidak punya izin 'Create Public Threads' di channel: ${destChannel.name}`);
                        }
                    } catch (threadError) {
                        logger.error('[CONFESS THREAD ERROR] Gagal menginisialisasi thread:', threadError);
                    }

                    if (guildData.confessLogChannel) {
                        const adminLogChannel = guild.channels.cache.get(guildData.confessLogChannel);
                        if (adminLogChannel) {
                            const adminLogEmbed = new EmbedBuilder()
                                .setAuthor({ 
                                    name: '🛡️ INTERNAL SECURITY CONFESS LOG:', 
                                    iconURL: 'https://abs.twimg.com/emoji/v2/72x72/1f50d.png'
                                })
                                .setThumbnail(userExecutor.displayAvatarURL({ dynamic: true }))
                                .setColor('#e63946')
                                .setDescription(
                                    `🔹 **Data Informasi Pengirim:**\n` +
                                    `• **Akun:** ${userExecutor} \`(${userExecutor.tag})\`\n` +
                                    `• **ID Pengguna:** \`${userExecutor.id}\`\n` +
                                    `• **Kanal Pemicu:** <#${interaction.channelId}>\n\n` +
                                    `🔹 **Isi Pesan Confess:**\n` +
                                    `\`\`\`text\n${confessText}\`\`\``
                                )
                                .setFooter({ text: 'Sistem Deteksi Identitas Otomatis Lunaria' })
                                .setTimestamp();
                                
                            await adminLogChannel.send({ embeds: [adminLogEmbed] }).catch(() => null);
                        }
                    }

                    const successEmbed = embed.success(userExecutor, '💌 Surat Berhasil Dikirim', `Carik surat rahasiamu sudah disiarkan secara anonim ke saluran ${destChannel}!\n*Thread tanggapan telah dibuka otomatis.*`);
                    await interaction.editReply({ embeds: [successEmbed] });
                    
                    setTimeout(async () => {
                        await interaction.deleteReply().catch(() => null);
                    }, 5000);
                }

            } catch (err) {
                await safeErrorResponse(err, '❌ Gagal memproses dan menyiarkan pesan confess karena kendala sistem internal.');
            }
        }
    }
};