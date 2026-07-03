// D:\Lunaria_New 2\commands\utility\afk.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/profileSchema');

module.exports = {
    name: 'afk',
    aliases: ['setafk'],
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Mengaktifkan status AFK (Away From Keyboard).')
        .addStringOption(option => option.setName('alasan').setDescription('Alasan kamu pergi AFK')),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const reason = (isSlash ? context.options.getString('alasan') : args.join(' ')) || 'Mengurus dunia nyata.';
        const author = isSlash ? context.user : context.author;

        await Profile.findOneAndUpdate(
            { userId: author.id },
            { 
                $set: { 
                    'afk.isAfk': true, 
                    'afk.reason': reason, 
                    'afk.timestamp': Date.now(),
                    'afk.mentions': [] 
                } 
            },
            { upsert: true, new: true }
        );

        // ─── DESAIN NEO-MINIMALIST COAL SLATE ───
        const afkEmbed = new EmbedBuilder()
            .setColor('#2f3136') // Onyx Obsidian color
            .setAuthor({ name: 'User Workspace Environment', iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setTitle('🌙 AFK MODE: ENGAGED')
            .setDescription(
                `🔄 **Status:** *Away From Keyboard*\n` +
                `📌 **Alasan:** \`${reason}\`\n` +
                `⏱️ **Mulai Sejak:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                `───\n` +
                `*Sistem Lunaria otomatis membekukan obrolan aktif Anda dan siap mencatat seluruh aktivitas laporan.*`
            );

        await context.reply({ embeds: [afkEmbed] });
    }
};