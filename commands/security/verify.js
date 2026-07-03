const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const SecurityDB = require('../../models/securitySchema');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'setupverify',
    aliases: ['setverify', 'verifypanel'],
    data: new SlashCommandBuilder()
        .setName('setupverify')
        .setDescription('Menyiapkan sistem gerbang verifikasi tombol premium.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option =>
            option.setName('role_verifikasi')
                .setDescription('Role yang diberikan otomatis setelah member memverifikasi diri')
                .setRequired(true)
        ),

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

        let targetRole;
        if (isInteraction) {
            targetRole = context.options.getRole('role_verifikasi');
        } else {
            targetRole = context.mentions.roles.first() || 
                         (args && args[0] ? await context.guild.roles.fetch(args[0]).catch(() => null) : null);
        }

        if (!targetRole) {
            return sendResponse({
                embeds: [embed.error(userExecutor, 'Role Tidak Valid', 'Format salah! Tentukan role target verifikasi.\nContoh: `ln!setverify @Verified` atau `ln!setverify [ID_Role]`')]
            });
        }

        // Keamanan berlapis: Pastikan bot mampu memberikan role tersebut (cek hierarki posisi role)
        const botHighestRole = context.guild.members.me.roles.highest;
        if (targetRole.position >= botHighestRole.position) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Akses Gagal', `Aku tidak bisa memberikan role **${targetRole.name}** karena posisi role tersebut berada di atas atau setara dengan role tertinggiku! Pindahkan role bot ke posisi lebih atas.`)]
            });
        }

        try {
            let securityData = await SecurityDB.findOne({ guildId: guildId }) || new SecurityDB({ guildId: guildId });
            securityData.verifiedRole = targetRole.id;
            await securityData.save();

            // ROMBAK TOTAL VISUAL: Menggunakan gaya Cyber-Security Dashboard Card
            const avatarBotUrl = client.user.displayAvatarURL({ dynamic: true, size: 512 });

            const verifyEmbed = new EmbedBuilder()
                .setAuthor({ name: `${client.user.username} Security Gate Core`, iconURL: avatarBotUrl })
                .setTitle(`🛡️ SISTEM VERIFIKASI SERVER`)
                .setDescription(
                    `### ✨ Selamat Datang di ${context.guild.name}!\n` +
                    `Untuk menjaga keamanan komunitas dari serangan akun spam, bot jahat, dan raid, gerbang perlindungan server ini diaktifkan.\n\n` +
                    `\`\`\`ini\n` +
                    `[ PROSEDUR AKSES MASUK SERVER ]\n` +
                    `1. Silakan baca peraturan yang berlaku di server ini.\n` +
                    `2. Tekan tombol hijau "Verifikasi" di bawah ini.\n` +
                    `3. Sistem akan otomatis memvalidasi akun Anda.\n` +
                    `\`\`\`\n`
                )
                .setThumbnail(avatarBotUrl) // Menyematkan foto profil bot di pojok kanan embed
                .setColor('#0f111a')
                .setTimestamp()
                .setFooter({ text: 'Lunaria Anti-Raid Guard Engine v5.1', iconURL: avatarBotUrl });

            const verifyButton = new ButtonBuilder()
                .setCustomId('verify_member_btn') 
                .setLabel('Verifikasi')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🛡️');

            const row = new ActionRowBuilder().addComponents(verifyButton);

            // Kirim panel utama langsung ke channel teks saat ini
            await context.channel.send({ embeds: [verifyEmbed], components: [row] });

            await sendResponse({ 
                embeds: [embed.success(userExecutor, 'Setup Panel Sukses!', `Gerbang verifikasi visual telah didirikan di channel <#${context.channel.id}>.`)]
            });
        } catch (error) {
            logger.error(`[SETUPVERIFY ERROR] Gagal melakukan setup verifikasi di server ${guildId}`, error);
            await sendResponse({ embeds: [embed.error(userExecutor, 'Error', 'Gagal memproses pembuatan panel ke database MongoDB.')] });
        }
    }
};