// D:\Lunaria_New 2\commands\security\antilink.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const SecurityDB = require('../../models/securitySchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'antilink',
    aliases: ['blocklink', 'preventlink'],
    data: new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('Mengaktifkan atau menonaktifkan perlindungan Anti-Link (Pencegahan Iklan/Spam Link).')
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

            securityData.antiLink = !securityData.antiLink;
            await securityData.save();

            const status = securityData.antiLink ? '🟢 AKTIF' : '🔴 NONAKTIF';
            const desc = securityData.antiLink 
                ? 'Sistem **Anti-Link** telah dinyalakan. Member biasa tidak lagi bisa mengirim URL atau undangan (Invite) Discord ke server ini.'
                : 'Sistem **Anti-Link** telah dimatikan. Semua orang kini bebas mengirimkan URL.';

            await sendResponse({ embeds: [embed.success(userExecutor, `Status Anti-Link: ${status}`, desc)] });
        } catch (error) {
            logger.error(`[ANTILINK ERROR] Gagal mengatur antilink di server ${guildId}`, error);
            await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal menyimpan pengaturan ke database.')] });
        }
    }
};