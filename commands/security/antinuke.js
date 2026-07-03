const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const SecurityDB = require('../../models/securitySchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'antinuke',
    aliases: ['an', 'serverprotection'],
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('Mengaktifkan atau menonaktifkan sistem Anti-Nuke (Pencegahan Ban/Hapus Channel Massal).')
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

            securityData.antiNuke = !securityData.antiNuke;
            await securityData.save();

            const status = securityData.antiNuke ? '🟢 AKTIF' : '🔴 NONAKTIF';
            const desc = securityData.antiNuke 
                ? 'Sistem **Anti-Nuke** telah dinyalakan. Bot akan otomatis mencabut hak Admin siapa pun yang menghapus channel atau menge-ban member secara massal.'
                : 'Sistem **Anti-Nuke** telah dimatikan. Server tidak lagi dilindungi dari serangan Nuke.';

            await sendResponse({ embeds: [embed.success(userExecutor, `Status Anti-Nuke: ${status}`, desc)] });
        } catch (error) {
            logger.error(`[ANTINUKE ERROR] Gagal mengatur antinuke di server ${guildId}`, error);
            await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal menyimpan pengaturan ke database.')] });
        }
    }
};