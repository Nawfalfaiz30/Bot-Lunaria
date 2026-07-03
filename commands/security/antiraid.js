const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const SecurityDB = require('../../models/securitySchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'antiraid',
    aliases: ['ar', 'lockdownserver'],
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Mengaktifkan atau menonaktifkan sistem Anti-Raid (Pencegahan Bot Spam Join).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;
        const guildId = context.guild.id;

        if (isInteraction) await context.deferReply({ flags: [MessageFlags.Ephemeral] });

        const sendResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            return await context.reply(options);
        };

        if (!isInteraction && !context.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Akses Ditolak', 'Kamu tidak memiliki izin `Administrator` untuk menggunakan perintah ini.')] 
            });
        }

        try {
            let securityData = await SecurityDB.findOne({ guildId: guildId }) || new SecurityDB({ guildId: guildId });

            securityData.antiRaid = !securityData.antiRaid;
            await securityData.save();

            const status = securityData.antiRaid ? '🟢 AKTIF' : '🔴 NONAKTIF';
            const desc = securityData.antiRaid 
                ? 'Sistem **Anti-Raid** telah dinyalakan. Jika ada lonjakan member yang bergabung dalam waktu singkat, bot akan mengaktifkan sistem verifikasi darurat.'
                : 'Sistem **Anti-Raid** telah dimatikan. Pintu masuk server kembali normal.';

            await sendResponse({ embeds: [embed.success(userExecutor, `Status Anti-Raid: ${status}`, desc)] });
        } catch (error) {
            logger.error(`[ANTIRAID ERROR] Gagal mengatur antiraid di server ${guildId}`, error);
            await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal menyimpan pengaturan ke database.')] });
        }
    }
};