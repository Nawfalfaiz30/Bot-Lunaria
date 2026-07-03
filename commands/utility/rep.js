const { SlashCommandBuilder } = require('discord.js');
const UserDB = require('../../models/userSchema'); //
const embed = require('../../helpers/embed');

// Map penyimpanan cooldown internal penangkal spam (+1 rep per hari)
const repCooldown = new Map();

module.exports = {
    name: 'rep',
    aliases: ['reputation', 'tambahrep'],
    data: new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Memberikan poin poin reputasi baik kepada member lain.')
        .addUserOption(option => option.setName('target').setDescription('Member terpilih').setRequired(true)),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const target = isSlash ? context.options.getUser('target') : context.mentions.users.first();
        const author = isSlash ? context.user : context.author;

        if (!target || target.bot || target.id === author.id) {
            return context.reply({ content: 'Pengguna target tidak valid (tidak bisa memberi ke diri sendiri atau bot).', ephemeral: true });
        }

        // Cek limitasi cooldown 24 jam
        const lastUsed = repCooldown.get(author.id);
        const cdTime = 24 * 60 * 60 * 1000;
        if (lastUsed && (Date.now() - lastUsed < cdTime)) {
            const remaining = Math.ceil((cdTime - (Date.now() - lastUsed)) / (60 * 60 * 1000));
            return context.reply({ content: `Kamu kehabisan poin reputasi harian. Isi ulang dalam **${remaining} jam**.` });
        }

        // Cari profil database user target
        let targetProfile = await UserDB.findOne({ userId: target.id });
        if (!targetProfile) targetProfile = new UserDB({ userId: target.id, reputation: 0 });

        // Tambah poin reputasi
        targetProfile.reputation = (targetProfile.reputation || 0) + 1;
        await targetProfile.save();

        repCooldown.set(author.id, Date.now());

        await context.reply({ embeds: [embed.success(author, '✨ Poin Reputasi Dikirim', `Berhasil memberikan **+1 Poin Reputasi** kepada ${target.toString()}!`)] });
    }
};