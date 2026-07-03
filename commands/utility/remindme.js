// D:\Lunaria_New 2\commands\utility\remindme.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'remindme',
    aliases: ['remind', 'ingatkan'],
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Membuat alarm pengingat waktu pribadi via DM.')
        .addStringOption(option => option.setName('waktu').setDescription('Contoh: 10m, 1h, 30s').setRequired(true))
        .addStringOption(option => option.setName('pesan').setDescription('Pesan pengingat').setRequired(true)),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const timeStr = isSlash ? context.options.getString('waktu') : args[0];
        const msgStr = isSlash ? context.options.getString('pesan') : args.slice(1).join(' ');
        const author = isSlash ? context.user : context.author;
        const botClient = context.client;

        if (!timeStr || !msgStr) {
            return context.reply({ content: '❌ Format salah! Contoh: `ln!remindme 10m Seduh Mie`', ephemeral: true });
        }

        const timeMatch = timeStr.match(/^(\d+)([smh])$/);
        if (!timeMatch) {
            return context.reply({ content: '❌ Format durasi salah! Gunakan akhiran s (detik), m (menit), atau h (jam).', ephemeral: true });
        }

        const val = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        let durationMs = val * 1000;
        if (unit === 'm') durationMs = val * 60 * 1000;
        if (unit === 'h') durationMs = val * 60 * 60 * 1000;

        const targetTimestamp = Math.floor((Date.now() + durationMs) / 1000);

        // ─── DESAIN NEO-MINIMALIST COBALT BLUE (PUBLIK) ───
        const startEmbed = new EmbedBuilder()
            .setColor('#4f545c') 
            .setAuthor({ name: 'Time Capsule Utility System', iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setTitle('⏳ MEMO JALUR WAKTU DISIMPAN')
            .setDescription(
                `Penjadwalan pengingat untuk **${author.username}** berhasil dienkripsi ke sistem.\n\n` +
                `📥 **Isi Catatan:**\n\`\`\`text\n${msgStr}\`\`\`\n` +
                `⏱️ **Durasi Tunggu:** \`${timeStr}\`  •  🔔 **Pemicu Alarm:** <t:${targetTimestamp}:R>\n\n` +
                `───\n` +
                `*Surat pengingat privat akan diluncurkan langsung melalui Direct Messages (DM).*`
            );

        await context.reply({ embeds: [startEmbed] });

        setTimeout(async () => {
            try {
                // ─── DESAIN NEO-MINIMALIST VIBRANT MAGENTA (PRIVATE DM) ───
                const alarmEmbed = new EmbedBuilder()
                    .setColor('#ff73fa') 
                    .setAuthor({ name: 'Lunaria Automatic Reminder Line', iconURL: botClient.user.displayAvatarURL() })
                    .setTitle('🔔 ALARM PENGINGAT: WAKTU HABIS!')
                    .setDescription(
                        `Halo ${author}, kapsul waktu yang Anda jadwalkan telah terbuka otomatis.\n\n` +
                        `📌 **REKAMAN MEMO ANDA:**\n\`\`\`text\n${msgStr}\`\`\`\n` +
                        `🗺️ **Asal Lokasi:** \`Server: ${context.guild?.name || 'Private Sessions'}\`\n` +
                        `📅 **Disetel Sejak:** <t:${Math.floor((Date.now() - durationMs) / 1000)}:F>`
                    )
                    .setTimestamp();

                await author.send({ embeds: [alarmEmbed] });

            } catch (err) {
                console.error(`[REMINDME ERROR] Gagal mengirim alarm DM ke ${author.tag}`, err);
            }
        }, durationMs);
    }
};