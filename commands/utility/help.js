// D:\Lunaria_New 2\commands\utility\help.js
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    ComponentType, 
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { prefix: defaultPrefix } = require('../../config');
const GuildSettings = require('../../models/guildSchema');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'help',
    aliases: ['h', 'bantuan', 'menu'],
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Menampilkan menu bantuan interaktif otomatis bot.'),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const botClient = context.client;

        // 1. Sinkronisasi Custom Prefix Server
        let prefix = defaultPrefix || 'lr!'; 
        try {
            const guildData = await GuildSettings.findOne({ guildId: context.guild.id });
            if (guildData && guildData.prefix) prefix = guildData.prefix;
        } catch (error) {
            logger.error(`Gagal mengambil data prefix di help untuk server ${context.guild.id}`, error);
        }

        // 2. Inisialisasi Kategori Menu Publik (Bersih & Rapi)
        const categories = {
            rpg_core: { title: '⚔️ Modul RPG Core & Actions', desc: 'Sistem petualangan, pertarungan area, dan pengumpulan material.', commands: [] },
            rpg_econ: { title: '💰 Modul RPG Economy & Progression', desc: 'Manajemen finansial, pengelolaan tas item, perkakas, dan fitur memasak.', commands: [] },
            ai: { title: '🤖 Modul Otak Artificial Intelligence', desc: 'Kecerdasan buatan pelacak gambar, penerjemah, dan pembuat ilustrasi.', commands: [] },
            anime: { title: '🌸 Modul Jejaring Anime & Manga', desc: 'Pencarian database media animasi jepang, berita, dan waifu.', commands: [] },
            community: { title: '👥 Modul Komunitas & Fitur Chat', desc: 'Pusat pembuatan lobi room mabar game, serta manajemen tiket aduan.', commands: [] },
            games: { title: '🎮 Modul Mini Games & Manipulasi Gambar', desc: 'Kumpulan mini game kasual, interaksi sosial, dan filter gambar instan.', commands: [] },
            utility: { title: '🛠️ Modul Utilitas & Pusat Informasi', desc: 'Komand pembantu penunjang kebutuhan harian di dalam server.', commands: [] }
        };

        const adminCommands = { moderation: [], setup: [], security: [], voice_giveaway: [], hidden: [] };

        const hiddenModuleMap = {
            confess: 'Sistem Confess Rahasia',
            tickets: 'Sistem Tiket Support',
            giveaways: 'Sistem Sayembara Hadiah'
        };

        // 3. --- INTELLIGENT SCANNER ENGINE ---
        const commandsDir = path.resolve(__dirname, '..');

        function getCategoryKey(folderPath) {
            const normalized = folderPath.replace(/\\/g, '/').toLowerCase();
            if (normalized.includes('rpg/core') || normalized.includes('rpg/actions')) return 'rpg_core';
            if (normalized.includes('rpg/economy') || normalized.includes('rpg/progression')) return 'rpg_econ';
            if (normalized.includes('music')) return 'music';
            if (normalized.includes('ai')) return 'ai';
            if (normalized.includes('anime')) return 'anime';
            if (normalized.includes('mabar') || normalized.includes('tickets') || normalized.includes('confess')) return 'community';
            if (normalized.includes('games') || normalized.includes('fun') || normalized.includes('image')) return 'games';
            if (normalized.includes('utility') || normalized.includes('information')) return 'utility';
            return null;
        }

        function scanCommands(dir, relativePath = '') {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanCommands(fullPath, path.join(relativePath, file));
                } else if (file.endsWith('.js')) {
                    const commandName = file.slice(0, -3).toLowerCase();
                    const normalizedPath = relativePath.replace(/\\/g, '/').toLowerCase();

                    if (stat.size > 100) {
                        try {
                            const cmdModule = require(fullPath);
                            let extractedNames = [];

                            if (cmdModule.data && typeof cmdModule.data.toJSON === 'function') {
                                const dataJson = cmdModule.data.toJSON();
                                if (dataJson.options && dataJson.options.length > 0) {
                                    for (const opt of dataJson.options) {
                                        if (opt.type === 1) extractedNames.push(`${commandName} ${opt.name}`);
                                        else if (opt.type === 2 && opt.options) {
                                            for (const subOpt of opt.options) {
                                                if (subOpt.type === 1) extractedNames.push(`${commandName} ${opt.name} ${subOpt.name}`);
                                            }
                                        }
                                    }
                                }
                            }

                            if (extractedNames.length === 0) extractedNames.push(commandName);

                            for (const finalName of extractedNames) {
                                if (normalizedPath.includes('admin/moderation')) {
                                    if (!adminCommands.moderation.includes(finalName)) adminCommands.moderation.push(finalName);
                                } else if (normalizedPath.includes('admin/setup')) {
                                    if (!adminCommands.setup.includes(finalName)) adminCommands.setup.push(finalName);
                                } else if (normalizedPath.includes('security')) {
                                    if (!adminCommands.security.includes(finalName)) adminCommands.security.push(finalName);
                                } else if (normalizedPath.includes('voice') || normalizedPath.includes('giveaways')) {
                                    if (!adminCommands.voice_giveaway.includes(finalName)) adminCommands.voice_giveaway.push(finalName);
                                } else if (commandName === 'block' || commandName === 'close') {
                                    if (!adminCommands.hidden.includes(finalName)) adminCommands.hidden.push(finalName);
                                } else {
                                    const key = getCategoryKey(normalizedPath);
                                    if (key && !categories[key].commands.includes(finalName)) categories[key].commands.push(finalName);
                                }
                            }
                        } catch (err) {
                            const key = getCategoryKey(normalizedPath);
                            if (key && !categories[key].commands.includes(commandName)) categories[key].commands.push(commandName);
                        }
                    }
                }
            }
        }

        scanCommands(commandsDir);

        // Helper Grid Penyelaras Baris (Maksimal 4 Per Baris)
        function formatGrid(cmdArray) {
            if (!cmdArray || cmdArray.length === 0) return '> *Tidak ada perintah aktif.*';
            const chunks = [];
            for (let i = 0; i < cmdArray.length; i += 4) {
                chunks.push(cmdArray.slice(i, i + 4).map(cmd => `\`${cmd}\``).join('  ·  '));
            }
            return chunks.map(line => `> ➜  ${line}`).join('\n');
        }

        // 4. --- EMED BERANDA (Sleek Minimalist Index) ---
        const mainEmbed = new EmbedBuilder()
            .setTitle('📚 Lunaria Command Center')
            .setColor('#2b2d31')
            .setThumbnail(botClient.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Prefix server saat ini adalah \`${prefix}\` atau gunakan sistem \`/\` (Slash Command).

Gunakan **Menu Dropdown** di bawah untuk membuka daftar perintah lengkap berdasarkan modul fungsional yang tersedia:

⚔️ **RPG Core & Actions** — *Profile, Adventure, Hunt, dsb.*
💰 **RPG Economy & Progress** — *Bank, Shop, Inventory, Gacha.*
🤖 **Otak Artificial AI** — *Chat AI, Generator Gambar, Vision.*
🌸 **Anime & Manga Network** — *Database Anime, Info Karakter, Waifu.*
👥 **Komunitas & Hiburan** — *Lobi Mabar Game, Support Ticket.*
🎮 **Mini Games & Canvas** — *Casual Games, Roleplay, Filter Gambar.*
🛠️ **Utilitas & Informasi** — *Remindme, Status AFK, Info Server.*`)
            .setFooter({ text: 'Pilih kategori di bawah untuk melihat daftar command lengkap.' })
            .setTimestamp();

        // Mengompilasi Seluruh Lembar Embed Kategori User
        const categoryEmbeds = {};
        for (const [key, cat] of Object.entries(categories)) {
            categoryEmbeds[key] = new EmbedBuilder()
                .setTitle(cat.title)
                .setColor('#2b2d31')
                .setThumbnail(botClient.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`${cat.desc}

📦 **DAFTAR PERINTAH & SUBCOMMAND AKTIF:**
${formatGrid(cat.commands)}

───
*Ketik \`${prefix}<nama_command>\` atau gunakan shortcut \`/\` untuk mengeksekusi.*`);
        }

        // 5. --- SUSUN EMBED KHUSUS CLUSTER DROPDOWN ADMIN (Sleek List) ---
        const adminEmbeds = {
            admin_home: new EmbedBuilder()
                .setAuthor({ name: 'Lunaria Control Executive', iconURL: context.guild.iconURL({ dynamic: true }) })
                .setTitle('🛡️ ADMINISTRATIVE MANAGEMENT DASHBOARD')
                .setColor('#2b2d31')
                .setThumbnail(botClient.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`Selamat datang di pusat kendali yurisdiksi eksekutif server **${context.guild.name}**.

Silakan gunakan **Dropdown Menu Admin** di bawah untuk membuka daftar perintah kepengurusan per sektor otoritas secara terpisah.

⚖️ **Cluster Moderasi Sanksi** — *Ban, Kick, Timeout, Mute, Purge, Lock.*
⚙️ **Cluster Setup & Panel** — *Welcome, Logs, Voice Generator, Panel Tombol.*
🛡️ **Protokol Keamanan Server** — *Sistem Tameng, Anti-Raid, Auto-Mod, Anti-Link.*
⚡ **Voice & Giveaway Center** — *Manajemen Sayembara & Kontrol JTC Voice.*
🔒 **Restricted Rights Control** — *Akses khusus pada fungsionalitas modul publik.*`),

            moderation: new EmbedBuilder()
                .setTitle('⚖️ Cluster Moderasi Operasional')
                .setColor('#2b2d31')
                .setDescription(`Sistem eksekusi hukum, pembatasan hak chat, tata tertib, dan pembersihan ruang obrolan.

📦 **DAFTAR PERINTAH KEPENGURUSAN:**
${formatGrid(adminCommands.moderation)}`),

            setup: new EmbedBuilder()
                .setTitle('⚙️ Cluster Configuration & Panel Setup')
                .setColor('#2b2d31')
                .setDescription(`Inisialisasi sistem log audit server, auto-role, penempatan panel tombol tiket, dan confess rahasia.

📦 **DAFTAR PERINTAH KEPENGURUSAN:**
${formatGrid(adminCommands.setup)}`),

            security: new EmbedBuilder()
                .setTitle('🛡️ Modul Protokol Keamanan Server')
                .setColor('#2b2d31')
                .setDescription(`Sistem pertahanan lapis baja otomatis pencegah infiltrasi bot raid, pembuat spam, anti-link, dan gerbang verifikasi.

📦 **DAFTAR PERINTAH KEPENGURUSAN:**
${formatGrid(adminCommands.security)}`),

            voice_giveaway: new EmbedBuilder()
                .setTitle('⚡ Voice & Giveaway Management Center')
                .setColor('#2b2d31')
                .setDescription(`Pusat otoritas pengaturan durasi sayembara berhadiah serta hak kontrol room voice privat dinamis (JTC).

📦 **DAFTAR PERINTAH KEPENGURUSAN:**
${formatGrid(adminCommands.voice_giveaway)}`),

            hidden: new EmbedBuilder()
                .setTitle('🔒 Restricted Privileges Control')
                .setColor('#2b2d31')
                .setDescription(`Daftar komand penunjang administrasi yang tertanam di dalam modul publik (Contoh: Menutup tiket support, membanned ID confess anonim).

📦 **DAFTAR PERINTAH KEPENGURUSAN:**
${formatGrid(adminCommands.hidden)}`)
        };

        // 6. --- ACTION ROWS DROPDOWN GENERATOR ---
        const userSelectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_user_dropdown')
                .setPlaceholder('📁 Pilihlah Kategori Perintah di Sini...')
                .addOptions([
                    { label: 'Menu Beranda / Overview', value: 'main_home', emoji: '📚' },
                    { label: 'RPG Core & Actions', value: 'rpg_core', emoji: '⚔️' },
                    { label: 'RPG Economy & Progress', value: 'rpg_econ', emoji: '💰' },
                    { label: 'Otak AI', value: 'ai', emoji: '🤖' },
                    { label: 'Anime & Manga', value: 'anime', emoji: '🌸' },
                    { label: 'Komunitas & Hiburan', value: 'community', emoji: '👥' },
                    { label: 'Mini Games & Image', value: 'games', emoji: '🎮' },
                    { label: 'Utilitas & Informasi', value: 'utility', emoji: '🛠️' }
                ])
        );

        const adminSelectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_admin_dropdown')
                .setPlaceholder('🛡️ Pilihlah Kluster Otoritas Admin...')
                .addOptions([
                    { label: 'Dashboard Admin Utama', value: 'admin_home', emoji: '🎛️' },
                    { label: 'Cluster Moderasi Sanksi', value: 'moderation', emoji: '⚖️' },
                    { label: 'Cluster Setup & Panel', value: 'setup', emoji: '⚙️' },
                    { label: 'Protokol Keamanan Server', value: 'security', emoji: '🛡️' },
                    { label: 'Voice & Giveaway Center', value: 'voice_giveaway', emoji: '⚡' },
                    { label: 'Restricted Rights Control', value: 'hidden', emoji: '🔒' }
                ])
        );

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_admin_mode_btn').setLabel('Menu Admin').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('help_user_mode_btn').setLabel('Beranda User').setEmoji('🏠').setStyle(ButtonStyle.Secondary)
        );

        const response = await context.reply({ embeds: [mainEmbed], components: [userSelectRow, buttonRow] });

        // 7. --- ENGINE INTERACTIVE COLLECTOR ---
        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== author.id) {
                return interaction.reply({ content: '❌ Navigasi ini terkunci. Ketik `help` untuk memicu menumu sendiri.', ephemeral: true });
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'help_user_dropdown') {
                const selected = interaction.values[0];
                if (selected === 'main_home') {
                    await interaction.update({ embeds: [mainEmbed], components: [userSelectRow, buttonRow] });
                } else {
                    await interaction.update({ embeds: [categoryEmbeds[selected]], components: [userSelectRow, buttonRow] });
                }
            }

            else if (interaction.isStringSelectMenu() && interaction.customId === 'help_admin_dropdown') {
                const selected = interaction.values[0];
                await interaction.update({ embeds: [adminEmbeds[selected]], components: [adminSelectRow, buttonRow] });
            }

            else if (interaction.isButton()) {
                if (interaction.customId === 'help_admin_mode_btn') {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return interaction.reply({ content: '❌ Akses Terkunci! Tombol ini hanya boleh diakses oleh Administrator server.', ephemeral: true });
                    }
                    await interaction.update({ embeds: [adminEmbeds.admin_home], components: [adminSelectRow, buttonRow] });
                } 
                else if (interaction.customId === 'help_user_mode_btn') {
                    await interaction.update({ embeds: [mainEmbed], components: [userSelectRow, buttonRow] });
                }
            }
        });

        collector.on('end', async () => {
            try {
                if (isSlash) {
                    await context.editReply({ components: [] });
                } else {
                    await response.edit({ components: [] }).catch(() => null);
                }
            } catch (e) {}
        });
    }
};