const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSchema'); //
const embed = require('../../helpers/embed');

module.exports = {
    name: 'suggest',
    aliases: ['saran', 'masukan'],
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Mengirimkan ide saran/masukan untuk kemajuan server.')
        .addStringOption(option => option.setName('isi').setDescription('Tulis saran masukanmu').setRequired(true)),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const text = isSlash ? context.options.getString('isi') : args.join(' ');
        const author = isSlash ? context.user : context.author;

        if (!text) return context.reply({ content: 'Tulis ide saranmu terlebih dahulu!', ephemeral: true });

        // Cari konfigurasi log channel saran dari database guild
        const guildData = await GuildSettings.findOne({ guildId: context.guild.id });
        
        // Sebagai fallback aman jika channel log belum disetup formal, kirim langsung ke channel saat ini
        const targetChannel = context.guild.channels.cache.get(guildData?.logChannel) || context.channel;

        const suggestEmbed = new EmbedBuilder()
            .setTitle('💡 IDE & SARAN BARU')
            .setColor('#f1c40f')
            .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setDescription(text)
            .setTimestamp();

        if (targetChannel.id === context.channel.id) {
            const msg = await context.reply({ embeds: [suggestEmbed], fetchReply: true });
            await msg.react('✅');
            await msg.react('❌');
        } else {
            const msg = await targetChannel.send({ embeds: [suggestEmbed] });
            await msg.react('✅');
            await msg.react('❌');
            await context.reply({ content: 'Saranmu telah dikirimkan ke saluran pusat masukan admin! Terima kasih. 👍', ephemeral: true });
        }
    }
};