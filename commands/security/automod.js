const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const SecurityDB = require('../../models/securitySchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'automod',
    aliases: ['am', 'filterbadwords', 'badwords'],
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Pusat manajemen penyaringan kata kasar (Auto-Moderator).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Subcommand 1: Toggle Aktif/Nonaktif
        .addSubcommand(sub => sub.setName('toggle').setDescription('Mengaktifkan atau menonaktifkan fitur AutoMod.'))
        // Subcommand 2: Tambah Kata
        .addSubcommand(sub => sub.setName('add').setDescription('Menambahkan kata baru ke dalam daftar hitam server.')
            .addStringOption(opt => opt.setName('kata').setDescription('Kata kasar yang ingin diblokir').setRequired(true))
        )
        // Subcommand 3: Hapus Kata
        .addSubcommand(sub => sub.setName('remove').setDescription('Menghapus kata dari daftar hitam server.')
            .addStringOption(opt => opt.setName('kata').setDescription('Kata terlarang yang ingin diizinkan kembali').setRequired(true))
        )
        // Subcommand 4: Lihat List
        .addSubcommand(sub => sub.setName('list').setDescription('Menampilkan seluruh daftar kata kasar yang diblokir di server ini.')),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;
        const guildId = context.guild.id;

        // Amankan interaksi agar tidak memicu error API Timeout 3 detik
        if (isInteraction) await context.deferReply({ flags: [MessageFlags.Ephemeral] });

        const sendResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            return await context.reply(options);
        };

        // Validasi hak Administrator khusus untuk Legacy Prefix Command
        if (!isInteraction && !context.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Akses Ditolak', 'Kamu tidak memiliki izin `Administrator` untuk menjalankan perintah ini.')] 
            });
        }

        // Ekstraksi sub-command secara hibrida
        const subCommand = isInteraction ? context.options.getSubcommand() : args[0]?.toLowerCase();

        if (!subCommand) {
            return sendResponse({
                content: '❌ **Format Salah!** Gunakan perintah: `ln!automod <toggle/add/remove/list>`'
            });
        }

        try {
            let securityData = await SecurityDB.findOne({ guildId: guildId }) || new SecurityDB({ guildId: guildId });

            switch (subCommand) {
                case 'toggle': {
                    securityData.autoMod = !securityData.autoMod;
                    await securityData.save();

                    const status = securityData.autoMod ? '🟢 AKTIF' : '🔴 NONAKTIF';
                    const desc = securityData.autoMod 
                        ? 'Sistem **Auto Mod** dinyalakan. Setiap pesan teks member biasa yang mengandung kata di list blacklist akan dihapus otomatis.'
                        : 'Sistem **Auto Mod** dimatikan. Penyaringan kata kasar dinonaktifkan.';

                    return sendResponse({ embeds: [embed.success(userExecutor, `Status AutoMod Server: ${status}`, desc)] });
                }

                case 'add': {
                    const kataInput = isInteraction ? context.options.getString('kata') : args.slice(1).join(' ');
                    if (!kataInput) return sendResponse({ content: '❌ Harap tentukan kata yang ingin diblokir! Contoh: `ln!automod add <kata>`' });

                    const kataBersih = kataInput.trim().toLowerCase();
                    
                    // Cek duplikasi data kata di database
                    if (securityData.badwords.includes(kataBersih)) {
                        return sendResponse({ content: `⚠️ Kata \`${kataBersih}\` sudah ada di dalam daftar blacklist server ini.` });
                    }

                    securityData.badwords.push(kataBersih);
                    await securityData.save();

                    return sendResponse({
                        embeds: [embed.success(userExecutor, 'Blacklist Diperbarui', `Berhasil menambahkan kata \`${kataBersih}\` ke dalam daftar blokir terlarang.`)]
                    });
                }

                case 'remove': {
                    const kataInput = isInteraction ? context.options.getString('kata') : args.slice(1).join(' ');
                    if (!kataInput) return sendResponse({ content: '❌ Harap tentukan kata yang ingin dihapus! Contoh: `ln!automod remove <kata>`' });

                    const kataBersih = kataInput.trim().toLowerCase();

                    if (!securityData.badwords.includes(kataBersih)) {
                        return sendResponse({ content: `⚠️ Kata \`${kataBersih}\` tidak ditemukan di dalam daftar blacklist server ini.` });
                    }

                    // Saring dan keluarkan kata dari array database
                    securityData.badwords = securityData.badwords.filter(w => w !== kataBersih);
                    await securityData.save();

                    return sendResponse({
                        embeds: [embed.success(userExecutor, 'Blacklist Diperbarui', `Berhasil menghapus kata \`${kataBersih}\` dari daftar kata terlarang.`)]
                    });
                }

                case 'list': {
                    const daftarKata = securityData.badwords;
                    
                    if (!daftarKata || daftarKata.length === 0) {
                        return sendResponse({
                            embeds: [embed.info(userExecutor, 'Daftar Kosong', 'Belum ada kata terlarang yang didaftarkan di server ini.')]
                        });
                    }

                    // Urutkan daftar kata secara alfabetis agar scannable
                    const daftarUrut = [...daftarKata].sort();

                    const embedList = new EmbedBuilder()
                        .setAuthor({ name: `AutoMod Management ─ ${context.guild.name}`, iconURL: context.guild.iconURL({ dynamic: true }) })
                        .setTitle('🚫 Daftar Kata Terlarang (Badwords List)')
                        .setColor('#2b2d31')
                        .setDescription(daftarUrut.map((kata, i) => `\`${(i + 1).toString().padStart(2, '0')}.\` ─ ${kata}`).join('\n'))
                        .setTimestamp()
                        .setFooter({ text: `Status Engine: ${securityData.autoMod ? 'Aktif' : 'Nonaktif'}` });

                    return sendResponse({ embeds: [embedList] });
                }

                default:
                    return sendResponse({ content: '❌ Opsi tidak valid. Gunakan sub-perintah: `toggle`, `add`, `remove`, atau `list`.' });
            }

        } catch (error) {
            logger.error(`[AUTOMOD COMMAND ERROR] Terjadi kegagalan proses database di server ${guildId}`, error);
            await sendResponse({ content: '❌ Gagal memproses data keamanan menuju MongoDB.' });
        }
    }
};