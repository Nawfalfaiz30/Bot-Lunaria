// D:\Lunaria_New 2\commands\security\antighostping.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const SecurityDB = require('../../models/securitySchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'antighostping',
    aliases: ['ghostping', 'antigp'],
    data: new SlashCommandBuilder()
        .setName('antighostping')
        .setDescription('Mengaktifkan atau menonaktifkan sistem Anti-Ghostping (Mention lalu hapus pesan).')
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

            securityData.ghostPingProtection = !securityData.ghostPingProtection;
            await securityData.save();

            const status = securityData.ghostPingProtection ? '🟢 AKTIF' : '🔴 NONAKTIF';
            const desc = securityData.ghostPingProtection 
                ? 'Sistem **Anti-Ghostping** telah dinyalakan. Bot akan otomatis mengungkap identitas siapa pun yang menge-tag member lalu menghapus pesannya.'
                : 'Sistem **Anti-Ghostping** telah dimatikan. Detektor ghostping dinonaktifkan.';

            await sendResponse({ embeds: [embed.success(userExecutor, `Status Anti-Ghostping: ${status}`, desc)] });
        } catch (error) {
            logger.error(`[ANTIGHOSTPING ERROR] Gagal mengatur status di server ${guildId}`, error);
            await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal menyimpan pengaturan ke database.')] });
        }
    }
};