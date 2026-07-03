const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketadd')
        .setDescription('Menambahkan member ke dalam channel tiket ini.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Member yang ingin diundang ke tiket ini')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const channel = interaction.channel;

        // Validasi sederhana: Pastikan ini benar-benar channel tiket (biasanya namanya mengandung 'ticket')
        if (!channel.name.includes('ticket')) {
            return interaction.reply({ 
                embeds: [embed.error(interaction.user, 'Gagal', 'Perintah ini hanya bisa digunakan di dalam channel Tiket!')], 
                ephemeral: true 
            });
        }

        try {
            // Mengubah izin channel agar target user bisa melihat dan mengirim pesan
            await channel.permissionOverwrites.edit(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.reply({ 
                embeds: [embed.success(interaction.user, 'Member Ditambahkan', `Berhasil menambahkan <@${user.id}> ke dalam tiket ini.`)] 
            });

        } catch (error) {
            logger.error(`[TICKET ADD ERROR] Gagal menambah user di ${channel.id}`, error);
            await interaction.reply({ embeds: [embed.error(interaction.user, 'Error', 'Gagal mengubah izin channel.')], ephemeral: true });
        }
    }
};