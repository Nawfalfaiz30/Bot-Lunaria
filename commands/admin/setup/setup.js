const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const GuildSettings = require('../../../models/guildSchema');
const embed = require('../../../helpers/embed');
const logger = require('../../../helpers/logger');

module.exports = {
    name: 'setup',
    aliases: ['set', 'setting'],
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Pusat pengaturan konfigurasi server Lunaria.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 1. Prefix
        .addSubcommand(sub => sub.setName('prefix').setDescription('Mengubah prefix perintah teks server.')
            .addStringOption(opt => opt.setName('baru').setDescription('Prefix baru ').setRequired(true))
        )
        // 2. Anime
        .addSubcommand(sub => sub.setName('anime').setDescription('Mengatur channel notifikasi episode Anime.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel notifikasi').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        // 3. Boost
        .addSubcommand(sub => sub.setName('boost').setDescription('Mengatur channel notifikasi Server Boost (Nitro).')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel notifikasi').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        // 4. Confess
        .addSubcommand(sub => sub.setName('confess').setDescription('Mengatur sistem Confess (Pesan Rahasia).')
            .addChannelOption(opt => opt.setName('panel').setDescription('Channel A: Saluran penempatan tombol tulis confess').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addChannelOption(opt => opt.setName('publik').setDescription('Channel B: Saluran publik tempat pesan anonim disiarkan').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addChannelOption(opt => opt.setName('log').setDescription('Channel C: Saluran log rahasia pelacakan identitas Admin').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        // 5. Goodbye
        .addSubcommand(sub => sub.setName('goodbye').setDescription('Mengatur channel kartu perpisahan member keluar.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel perpisahan').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addStringOption(opt => opt.setName('pesan').setDescription('Teks perpisahan (Gunakan {user} / {server})').setRequired(false))
        )
        // FIX INTEGRASI: Subcommand Baru untuk Giveaway Logs
        .addSubcommand(sub => sub.setName('giveaway').setDescription('Mengatur channel pusat log dan pengumuman pemenang giveaway.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel log giveaway').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        // 6. Logs
        .addSubcommand(sub => sub.setName('logs').setDescription('Mengatur channel pusat log keamanan server.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel log').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        // 7. Roles
        .addSubcommand(sub => sub.setName('roles').setDescription('Mengatur Auto-Role dan Mute Role.')
            .addRoleOption(opt => opt.setName('auto_role').setDescription('Role untuk member baru').setRequired(false))
            .addRoleOption(opt => opt.setName('mute_role').setDescription('Role hukuman').setRequired(false))
        )
        // 8. Ticket
        .addSubcommand(sub => sub.setName('ticket').setDescription('Mengatur sistem Tiket Bantuan.')
            .addChannelOption(opt => opt.setName('panel').setDescription('Channel panel tombol tiket').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addChannelOption(opt => opt.setName('kategori').setDescription('Kategori folder tiket dibuat').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addChannelOption(opt => opt.setName('log').setDescription('Channel log transkrip tiket').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addRoleOption(opt => opt.setName('role_support').setDescription('Role tim Admin/Moderator (Opsional)').setRequired(false))
        )
        // 9. Voice
        .addSubcommand(sub => sub.setName('voice').setDescription('Mengatur channel Generator Private Voice (JTC).')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel voice generator').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        )
        // 10. Welcome
        .addSubcommand(sub => sub.setName('welcome').setDescription('Mengatur channel sambutan member baru.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel sambutan').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addStringOption(opt => opt.setName('pesan').setDescription('Teks sambutan (Gunakan {user} / {server})').setRequired(false))
        ),

    async execute(context, args, clientInstance) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const guildId = context.guild.id;
        const botClient = context.client;

        const subCommand = isSlash ? context.options.getSubcommand() : args[0]?.toLowerCase();
        const subArgs = isSlash ? [] : args.slice(1);

        let isDeferred = false;

        const sendResponse = async (options) => {
            if (isSlash) {
                if (isDeferred) {
                    return await context.editReply(options);
                }
                return await context.reply(options);
            } else {
                if (options.flags) delete options.flags; 
                return await context.reply(options);
            }
        };

        if (!isSlash && !context.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return sendResponse({ embeds: [embed.error(author, 'Akses Ditolak', 'Kamu tidak memiliki izin `Administrator`.')] });
        }

        if (!subCommand) {
            return sendResponse({ 
                content: '❌ Opsi setup tidak lengkap! Gunakan format: `ln!setup <kategori>`\nKategori: `prefix`, `anime`, `boost`, `confess`, `goodbye`, `giveaway`, `logs`, `roles`, `ticket`, `voice`, `welcome`', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        try {
            if (isSlash) {
                const isEphemeral = subCommand !== 'prefix';
                await context.deferReply({ flags: isEphemeral ? [MessageFlags.Ephemeral] : [] });
                isDeferred = true;
            }

            let guildData = await GuildSettings.findOne({ guildId: guildId }) || new GuildSettings({ guildId: guildId });

            switch (subCommand) {

                case 'prefix': {
                    const newPrefix = isSlash ? context.options.getString('baru') : subArgs[0];
                    guildData.prefix = newPrefix;
                    await guildData.save();
                    return sendResponse({ embeds: [embed.success(author, 'Prefix Diubah', `Prefix server berhasil diubah menjadi \`${newPrefix}\``)] });
                }

                case 'anime': {
                    const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first() || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    if (!channel || channel.type !== ChannelType.GuildText) return sendResponse({ content: 'Tentukan channel teks yang valid!', flags: [MessageFlags.Ephemeral] });
                    
                    guildData.animeChannel = channel.id;
                    await guildData.save();
                    return sendResponse({ embeds: [embed.success(author, 'Anime Diaktifkan', `Channel <#${channel.id}> diatur sebagai pusat informasi Anime. 🍿`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'boost': {
                    const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first() || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    if (!channel || channel.type !== ChannelType.GuildText) return sendResponse({ content: 'Tentukan channel teks yang valid!', flags: [MessageFlags.Ephemeral] });
                    
                    guildData.boostChannel = channel.id;
                    await guildData.save();
                    return sendResponse({ embeds: [embed.success(author, 'Boost Diaktifkan', `Channel <#${channel.id}> diatur sebagai notifikasi Server Boost. 🚀`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'confess': {
                    let panelChannel, pubChannel, logChannel;
                    if (isSlash) {
                        panelChannel = context.options.getChannel('panel');
                        pubChannel = context.options.getChannel('publik');
                        logChannel = context.options.getChannel('log');
                    } else {
                        panelChannel = context.mentions.channels.at(0) || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                        pubChannel = context.mentions.channels.at(1) || await context.guild.channels.fetch(subArgs[1]).catch(() => null);
                        logChannel = context.mentions.channels.at(2) || await context.guild.channels.fetch(subArgs[2]).catch(() => null);
                    }

                    if (!panelChannel || !pubChannel || !logChannel) {
                        return sendResponse({ content: 'Tentukan Channel A (panel), Channel B (publik), dan Channel C (log) dengan benar!', flags: [MessageFlags.Ephemeral] });
                    }

                    guildData.confessChannel = pubChannel.id;
                    guildData.confessLogChannel = logChannel.id;
                    await guildData.save();

                    const panelEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${botClient.user.username} Confession System`, iconURL: botClient.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle('💌 Kirim Pesan Rahasia Anonim 💌')
                        .setDescription(
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `🤍 **Punya rahasia, keluh kesah, atau pesan manis yang terpendam?**\n\n` +
                            `Kamu bisa mengungkapkannya di server ini secara **100% Anonim** tanpa perlu takut identitas aslimu diketahui oleh siapa pun.\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `👇 *Klik tombol di bawah ini untuk mulai menulis carik surat rahasiamu!*`
                        )
                        .setColor('#ff7597')
                        .setFooter({ text: '🔒 Keamanan privasi identitas dijamin sepenuhnya oleh sistem.', iconURL: botClient.user.displayAvatarURL() });
                        
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('confess_create')
                            .setLabel('Tulis Surat Anonim')
                            .setEmoji('✉️')
                            .setStyle(ButtonStyle.Success)
                    );

                    await panelChannel.send({ embeds: [panelEmbed], components: [row] });
                    return sendResponse({ embeds: [embed.success(author, 'Setup Confess Berhasil', `Panel (Channel A): <#${panelChannel.id}>\nPublik (Channel B): <#${pubChannel.id}>\nLog (Channel C): <#${logChannel.id}>`)], flags: [MessageFlags.Ephemeral] });
                }
                
                case 'goodbye': {
                    const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first() || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    const msg = isSlash ? context.options.getString('pesan') : subArgs.slice(1).join(' ');
                    if (!channel || channel.type !== ChannelType.GuildText) return sendResponse({ content: 'Tentukan channel teks yang valid!', flags: [MessageFlags.Ephemeral] });

                    guildData.goodbyeChannel = channel.id;
                    if (msg) guildData.goodbyeMessage = msg;
                    await guildData.save();

                    return sendResponse({ embeds: [embed.success(author, 'Goodbye Diaktifkan', `Channel: <#${channel.id}>\nPesan: ${msg ? `\`${msg}\`` : '*Default*'}`)], flags: [MessageFlags.Ephemeral] });
                }

                // FIX INTEGRASI: Menghubungkan Subcommand ke Kolom Skema Baru
                case 'giveaway': {
                    const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first() || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    if (!channel || channel.type !== ChannelType.GuildText) return sendResponse({ content: 'Tentukan channel teks yang valid!', flags: [MessageFlags.Ephemeral] });

                    guildData.giveawayLogChannel = channel.id;
                    await guildData.save();

                    try { await channel.send({ embeds: [embed.success(author, 'Sistem Log Giveaway Aktif', 'Pusat pencatatan riwayat pengundian diaktifkan di saluran ini.')] }); } catch(e) {}
                    return sendResponse({ embeds: [embed.success(author, 'Setup Log Giveaway Sukses', `Seluruh informasi pemenang dan drop event akan dikirimkan menuju <#${channel.id}>.`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'logs': {
                    const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first() || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    if (!channel || channel.type !== ChannelType.GuildText) return sendResponse({ content: 'Tentukan channel teks yang valid!', flags: [MessageFlags.Ephemeral] });

                    guildData.logChannel = channel.id;
                    await guildData.save();
                    try { await channel.send({ embeds: [embed.success(author, 'Sistem Log Aktif', 'Pusat pencatatan aktivitas moderasi diaktifkan.')] }); } catch(e) {}
                    return sendResponse({ embeds: [embed.success(author, 'Setup Log Berhasil', `Sistem keamanan dialihkan ke <#${channel.id}>.`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'roles': {
                    let autoRole, muteRole;
                    if (isSlash) {
                        autoRole = context.options.getRole('auto_role');
                        muteRole = context.options.getRole('mute_role');
                    } else {
                        autoRole = subArgs[0] && subArgs[0] !== 'none' ? context.mentions.roles.at(0) || await context.guild.roles.fetch(subArgs[0]).catch(()=>null) : null;
                        muteRole = subArgs[1] && subArgs[1] !== 'none' ? context.mentions.roles.at(autoRole ? 1 : 0) || await context.guild.roles.fetch(subArgs[1]).catch(()=>null) : null;
                    }

                    if (!autoRole && !muteRole) return sendResponse({ content: 'Harus mengisi setidaknya Auto-Role atau Mute Role.', flags: [MessageFlags.Ephemeral] });

                    const botRole = context.guild.members.me.roles.highest;
                    if ((autoRole && autoRole.position >= botRole.position) || (muteRole && muteRole.position >= botRole.position)) {
                        return sendResponse({ content: 'Posisi role yang diatur lebih tinggi dari bot. Pindahkan role bot ke posisi lebih atas!', flags: [MessageFlags.Ephemeral] });
                    }

                    if (autoRole) guildData.autoRole = autoRole.id;
                    if (muteRole) guildData.muteRole = muteRole.id;
                    await guildData.save();

                    return sendResponse({ embeds: [embed.success(author, 'Setup Role Berhasil', `${autoRole ? `👋 Auto-Role: <@&${autoRole.id}>\n` : ''}${muteRole ? `🔇 Mute Role: <@&${muteRole.id}>` : ''}`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'ticket': {
                    let panel, kat, log, role;
                    if (isSlash) {
                        panel = context.options.getChannel('panel');
                        kat = context.options.getChannel('kategori');
                        log = context.options.getChannel('log');
                        role = context.options.getRole('role_support');
                    } else {
                        panel = context.mentions.channels.at(0) || await context.guild.channels.fetch(subArgs[0]).catch(()=>null);
                        kat = await context.guild.channels.fetch(subArgs[1]).catch(()=>null);
                        log = context.mentions.channels.at(1) || await context.guild.channels.fetch(subArgs[2]).catch(()=>null);
                        role = context.mentions.roles.first() || (subArgs[3] ? await context.guild.roles.fetch(subArgs[3]).catch(()=>null) : null);
                    }

                    if (!panel || !kat || !log) return sendResponse({ content: 'Parameter utama (panel, kategori, log) tidak lengkap!', flags: [MessageFlags.Ephemeral] });

                    guildData.ticketCategory = kat.id;
                    guildData.ticketLogChannel = log.id;
                    guildData.ticketSupportRole = role ? role.id : null;
                    await guildData.save();

                    const displayRoleText = role ? `<@&${role.id}>` : '*Tidak ada (Setiap Admin/Staf)*';
                    const panelEmbed = embed.info(author, '🎫 Pusat Bantuan (Support)', `Butuh bantuan staf pengurus server atau ingin mengajukan report aduan?\n\nTekan tombol di bawah ini untuk membuka tiket obrolan pribadi!`).setColor('#2ecc71');
                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('Ambil Tiket').setEmoji('📩').setStyle(ButtonStyle.Success));

                    await panel.send({ embeds: [panelEmbed], components: [row] });
                    return sendResponse({ embeds: [embed.success(author, 'Setup Tiket Berhasil', `Panel: <#${panel.id}>\nKategori: ${kat.name}\nLog: <#${log.id}>\nRole Support: ${displayRoleText}`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'voice': {
                    const channel = isSlash ? context.options.getChannel('channel') : await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    if (!channel || channel.type !== ChannelType.GuildVoice) return sendResponse({ content: 'Tentukan Voice Channel yang valid!', flags: [MessageFlags.Ephemeral] });

                    guildData.voiceGeneratorChannel = channel.id;
                    await guildData.save();
                    return sendResponse({ embeds: [embed.success(author, 'Private Voice Active', `Channel <#${channel.id}> telah menjadi Generator Room JTC.`)], flags: [MessageFlags.Ephemeral] });
                }

                case 'welcome': {
                    const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first() || await context.guild.channels.fetch(subArgs[0]).catch(() => null);
                    const msg = isSlash ? context.options.getString('pesan') : subArgs.slice(1).join(' ');
                    if (!channel || channel.type !== ChannelType.GuildText) return sendResponse({ content: 'Tentukan channel teks yang valid!', flags: [MessageFlags.Ephemeral] });

                    guildData.welcomeChannel = channel.id;
                    if (msg) guildData.welcomeMessage = msg;
                    await guildData.save();

                    return sendResponse({ embeds: [embed.success(author, 'Welcome Diaktifkan', `Channel: <#${channel.id}>\nPesan: ${msg ? `\`${msg}\`` : '*Default*'}`)], flags: [MessageFlags.Ephemeral] });
                }

                default:
                    return sendResponse({ content: '❌ Kategori setup tidak dikenali.', flags: [MessageFlags.Ephemeral] });
            }
        } catch (error) {
            logger.error(`[SETUP ERROR] Gagal setup ${subCommand || 'unknown'} di server ${guildId}`, error);
            throw error; 
        }
    }
};