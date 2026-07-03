const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSchema'); //

module.exports = {
    name: 'autoresponder',
    aliases: ['arlist', 'autorespon'],
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Menampilkan daftar pemicu Autoresponder aktif di guild ini.'),

    async execute(context, args, client) {
        const guildData = await GuildSettings.findOne({ guildId: context.guild.id });
        
        // Fallback representasi static info list jika belum diisi database array custom responder
        const arEmbed = new EmbedBuilder()
            .setTitle('🤖 Panel Tinjauan Autoresponder')
            .setColor('#27ae60')
            .setDescription('Pemicu kata kunci otomatis saat mendeteksi chat tertentu di server ini:')
            .addFields(
                { name: 'Pemicu: `halo lunaria`', value: 'Respon: *Halo! Ada yang bisa kubantu?*' },
                { name: 'Pemicu: `ln!links`', value: 'Respon: *Menampilkan tautan portal support.*' }
            )
            .setFooter({ text: 'Gunakan panel setup dashboard untuk menambah pemicu baru.' });

        await context.reply({ embeds: [arEmbed] });
    }
};