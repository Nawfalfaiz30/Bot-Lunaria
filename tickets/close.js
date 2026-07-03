const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketclose')
        .setDescription('Menutup dan menghapus channel tiket ini secara permanen.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const channel = interaction.channel;

        if (!channel.name.includes('ticket')) {
            return interaction.reply({ 
                embeds: [embed.error(interaction.user, 'Gagal', 'Perintah ini hanya bisa digunakan di dalam channel Tiket!')], 
                ephemeral: true 
            });
        }

        try {
            await interaction.reply({ 
                embeds: [embed.success(interaction.user, 'Menutup Tiket', 'Channel tiket ini akan ditutup dan dihapus dalam **5 Detik**...')] 
            });

            // Menunggu 5 detik sebelum menghapus channel
            setTimeout(() => {
                channel.delete().catch(err => logger.error(`[TICKET CLOSE] Gagal menghapus channel ${channel.id}`, err));
            }, 5000);

        } catch (error) {
            logger.error(`[TICKET CLOSE ERROR] Terjadi kesalahan saat menutup tiket di ${channel.id}`, error);
            // Fallback jika tidak bisa mengirim pesan
            interaction.reply({ content: 'Gagal memproses permintaan.', ephemeral: true }).catch(()=>null);
        }
    }
};