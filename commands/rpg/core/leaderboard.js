const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RpgDB = require('../../../models/rpgSchema');

module.exports = {
    name: 'rpgleaderboard',
    aliases: ['rpglb', 'lb', 'top'],
    data: new SlashCommandBuilder()
        .setName('rpgleaderboard')
        .setDescription('Melihat top 10 player RPG terkuat (Papan Peringkat).'),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;

        if (isInteraction) {
            await context.deferReply();
        } else {
            var loadingMessage = await context.reply({ content: '⏳ Memuat papan peringkat...' });
        }

        const sendResponse = async (options) => {
            if (isInteraction) {
                return await context.editReply(options);
            } else {
                return await loadingMessage.edit(options);
            }
        };

        try {
            // =================================================================
            // 🧠 ENGINE MUTAKHIR: MULTI-INDEX PRIORITY SORTING
            // =================================================================
            // Prioritas 1: Jumlah Time Travel Terbanyak (timetravel_count: -1)
            // Prioritas 2: Level Tertinggi jika TT sama (level: -1)
            // Prioritas 3: Sisa XP Terbanyak jika Level sama (xp: -1)
            const topPlayers = await RpgDB.find()
                .sort({ timetravel_count: -1, level: -1, xp: -1 }) // ◄ Perubahan poros sortir
                .limit(10);

            if (topPlayers.length === 0) {
                return sendResponse({ content: 'Belum ada petualang yang memulai perjalanan di RPG ini.' });
            }

            const lbEmbed = new EmbedBuilder()
                .setTitle('🏆 Papan Peringkat Agung Petualang Lunaria')
                .setColor('#f1c40f');

            let boardText = 'Berikut adalah 10 petualang terkuat penguasa lini masa saat ini!\n\n';
            topPlayers.forEach((p, index) => {
                let medal = '🏅';
                if (index === 0) medal = '🥇';
                if (index === 1) medal = '🥈';
                if (index === 2) medal = '🥉';

                // Format visual baru: Menonjolkan indikator Time Travel (TT) & Level secara berdampingan
                boardText += `${medal} **#${index + 1}** | <@${p.userId}>\n` +
                             `└ ⏳ **Inkarnasi:** \`${p.timetravel_count || 0}\` | ⚔️ **Lv:** \`${p.level}\` *(Class: ${p.class || 'Novice'})*\n\n`;
            });

            lbEmbed.setDescription(boardText);
            lbEmbed.setFooter({ text: `Gunakan ${isInteraction ? '/profile' : 'ln!profile'} untuk melihat status aslimu.` });

            await sendResponse({ content: null, embeds: [lbEmbed] });

        } catch (error) {
            await sendResponse({ content: '❌ Gagal memuat papan peringkat dewa.' });
        }
    }
};