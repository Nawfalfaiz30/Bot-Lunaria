const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Helper emoji angka untuk voting multi-opsi
const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
    name: 'poll',
    aliases: ['voting', 'tanyavote', 'jajak'],
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('📊 Membuat bilik pemungutan suara (Poll) kustom, mendukung hingga 10 opsi.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Membatasi Slash Command hanya untuk Admin
        .addStringOption(opt => opt.setName('pertanyaan').setDescription('Topik utama pemungutan suara').setRequired(true))
        .addStringOption(opt => opt.setName('pilihan1').setDescription('Opsi Pilihan 1').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan2').setDescription('Opsi Pilihan 2').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan3').setDescription('Opsi Pilihan 3').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan4').setDescription('Opsi Pilihan 4').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan5').setDescription('Opsi Pilihan 5').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan6').setDescription('Opsi Pilihan 6').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan7').setDescription('Opsi Pilihan 7').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan8').setDescription('Opsi Pilihan 8').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan9').setDescription('Opsi Pilihan 9').setRequired(false))
        .addStringOption(opt => opt.setName('pilihan10').setDescription('Opsi Pilihan 10').setRequired(false)),

    async execute(context, args = [], client) {
        const isSlash = context.options !== undefined;
        const author = isSlash ? context.user : context.author;
        const member = context.member;

        // ==========================================
        // VALIDASI HAK AKSES ADMIN (UNTUK PREFIX)
        // ==========================================
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            return context.reply({ 
                content: '❌ **Akses Ditolak!** Perintah ini hanya dapat digunakan oleh pengguna dengan hak akses **Administrator**.', 
                ephemeral: true 
            });
        }

        let question = '';
        let options = [];

        // ==========================================
        // PARSING INPUT (SLASH vs PREFIX)
        // ==========================================
        if (isSlash) {
            question = context.options.getString('pertanyaan');
            // Ambil opsi dari pilihan 1 sampai 10 jika diisi
            for (let i = 1; i <= 10; i++) {
                const opt = context.options.getString(`pilihan${i}`);
                if (opt) options.push(opt.trim());
            }
        } else {
            // Gabungkan argumen dan pisahkan berdasarkan tanda "|"
            const fullContent = args.join(' ');
            const parts = fullContent.split('|').map(p => p.trim()).filter(p => p.length > 0);

            if (parts.length === 0) {
                return context.reply({ content: '❌ **Format Salah!** Gunakan: `!poll Pertanyaan | Opsi 1 | Opsi 2`', ephemeral: true });
            }

            question = parts[0];
            options = parts.slice(1); // Opsi sisanya
        }

        // Validasi batas opsi (Maksimal 10)
        if (options.length > 10) {
            return context.reply({ content: '❌ Batas maksimal pembuatan opsi voting adalah **10 pilihan**!', ephemeral: true });
        }

        // ==========================================
        // CONFIGURATION & LAYOUT EMBED DESIGN
        // ==========================================
        const pollEmbed = new EmbedBuilder()
            .setColor('#a020f0') // Warna Ungu Neon Premium
            .setTitle('⚡ POLLING / PEMUNGUTAN SUARA')
            .setDescription(`### 📌 Pertanyaan:\n> **${question}**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            .setFooter({ text: `Dibuat oleh Admin: ${author.username} • Berikan suaramu di bawah!`, iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        let reactions = [];

        // Jika user menginputkan opsi kustom (minimal 2 opsi terdeteksi)
        if (options.length >= 2) {
            let optionDescription = '';
            for (let i = 0; i < options.length; i++) {
                optionDescription += `${EMOJIS[i]} — ${options[i]}\n\n`;
                reactions.push(EMOJIS[i]);
            }
            pollEmbed.addFields({ name: '📊 Silakan Pilih Opsi Berikut:', value: optionDescription });
        } 
        // Mode Default jika opsi kosong atau kurang dari 2 (Mode Ya / Tidak)
        else {
            pollEmbed.addFields(
                { name: '🟢 PILIHAN YA', value: 'Reaksi dengan 👍 jika Anda setuju.', inline: true },
                { name: '🔴 PILIHAN TIDAK', value: 'Reaksi dengan 👎 jika Anda menolak.', inline: true }
            );
            reactions = ['👍', '👎'];
        }

        // Send & Eksekusi Reaksi
        try {
            let msg;
            if (isSlash) {
                await context.reply({ embeds: [pollEmbed], fetchReply: true });
                msg = await context.fetchReply();
            } else {
                msg = await context.reply({ embeds: [pollEmbed] });
            }

            // Memasukkan reaksi emoji secara berurutan
            for (const emoji of reactions) {
                await msg.react(emoji);
            }
        } catch (error) {
            console.error('[POLL ERROR] Gagal mengirim atau mereaksi pesan voting:', error);
        }
    }
};