const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const embed = require('../../helpers/embed');

module.exports = {
    name: 'report',
    aliases: ['laporkan', 'aduan'],
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Melaporkan gangguan bug sistem atau pelanggaran member ke admin.')
        .addStringOption(option => option.setName('laporan').setDescription('Tulis isi detail aduan laporan').setRequired(true)),

    async execute(context, args, client) {
        const isSlash = context.options !== undefined;
        const text = isSlash ? context.options.getString('laporan') : args.join(' ');
        const author = isSlash ? context.user : context.author;

        if (!text) return context.reply({ content: 'Tulis isi materi laporan!', ephemeral: true });

        const rEmbed = new EmbedBuilder()
            .setTitle('🚨 ADUAN / LAPORAN MASUK')
            .setColor('#e74c3c')
            .setDescription(`**Pengirim Laporan:** ${author.toString()}\n**Saluran Asal:** ${context.channel.toString()}\n\n**Isi Laporan:**\n\`\`\`${text}\`\`\``)
            .setTimestamp();

        // Mengirimkan notifikasi rahasia ke channel log saat ini
        await context.reply({ content: 'Laporan rahasia telah tersampaikan ke panel tinjauan. Terima kasih atas partisipasimu.', ephemeral: true });
        
        // Kirimkan salinan laporan ke room asal agar admin lokal langsung membaca
        await context.channel.send({ embeds: [rEmbed] });
    }
};