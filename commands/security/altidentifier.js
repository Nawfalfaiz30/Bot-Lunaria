const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'altidentifier',
    aliases: ['checkalt', 'alt', 'altcheck'],
    data: new SlashCommandBuilder()
        .setName('altidentifier')
        .setDescription('Cek apakah seorang member berpotensi sebagai akun cadangan (Alt Account) berdasarkan usia akun.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Member yang ingin dicek')
                .setRequired(true)
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        // Amankan interaksi dari batas 3 detik API Discord
        if (isInteraction) await context.deferReply({ flags: [MessageFlags.Ephemeral] });

        const sendResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            return await context.reply(options);
        };

        if (!isInteraction && !context.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Akses Ditolak', 'Kamu tidak memiliki izin `Moderate Members` untuk menggunakan perintah ini.')] 
            });
        }

        let targetUser;
        if (isInteraction) {
            targetUser = context.options.getUser('target');
        } else {
            targetUser = context.mentions.users.first() || 
                         (args && args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        }

        if (!targetUser) {
            return sendResponse({
                embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Format salah! Tentukan member yang ingin dicek.\nContoh: `ln!alt @user` atau `ln!alt [ID_User]`')]
            });
        }

        const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) return sendResponse({ embeds: [embed.error(userExecutor, 'Gagal', 'Member tidak ditemukan di server.')] });

        const createdAt = targetUser.createdAt;
        const joinedAt = targetMember.joinedAt;
        const now = new Date();
        const accountAgeDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        const isPotentialAlt = accountAgeDays < 30;

        const altEmbed = new EmbedBuilder()
            .setAuthor({ name: `Analisa Akun: ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
            .setColor(isPotentialAlt ? '#e74c3c' : '#2ecc71')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '📅 Dibuat Pada', value: `<t:${Math.floor(createdAt.getTime() / 1000)}:R>`, inline: true }, 
                { name: '📥 Bergabung Server', value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:f>`, inline: true },
                { name: '⏳ Usia Akun Saat Ini', value: `**${accountAgeDays} Hari**`, inline: false },
                { name: '⚠️ Status Analisa', value: isPotentialAlt ? '⛔ **BERPOTENSI AKUN ALT/BARU**' : '✅ **AKUN AMAN (BERUSIA)**', inline: false }
            )
            .setFooter({ text: `Dicek oleh: ${userExecutor.tag}` });

        if (isPotentialAlt) {
            altEmbed.setDescription('🔴 **Peringatan Mod:** Akun ini dibuat kurang dari 30 hari yang lalu. Mohon diawasi gerak-geriknya untuk mencegah spam atau raid.');
        }

        await sendResponse({ embeds: [altEmbed] });
    }
};