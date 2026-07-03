const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickettranscript')
        .setDescription('Merekam dan membuat file HTML dari riwayat obrolan di tiket ini.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const channel = interaction.channel;

        if (!channel.name.includes('ticket')) {
            return interaction.reply({ 
                embeds: [embed.error(interaction.user, 'Gagal', 'Perintah ini hanya bisa digunakan di dalam channel Tiket!')], 
                ephemeral: true 
            });
        }

        // Tunda balasan karena membuat transcript mungkin butuh beberapa detik
        await interaction.deferReply(); 

        try {
            // Proses pembuatan Transcript HTML
            const transcript = await discordTranscripts.createTranscript(channel, {
                limit: -1, // -1 berarti rekam semua pesan tanpa batas
                returnType: 'attachment', // Kembalikan sebagai file lampiran
                filename: `${channel.name}-transcript.html`,
                saveImages: true, // Simpan gambar agar tidak hilang (Base64)
                poweredBy: false // Hapus watermark module
            });

            await interaction.editReply({ 
                content: `📁 **Transcript Tiket:** \`${channel.name}\` berhasil dibuat!`,
                files: [transcript] 
            });

        } catch (error) {
            logger.error(`[TICKET TRANSCRIPT ERROR] Gagal membuat transcript di ${channel.id}`, error);
            await interaction.editReply({ embeds: [embed.error(interaction.user, 'Error', 'Gagal memproses transcript tiket.')] });
        }
    }
};