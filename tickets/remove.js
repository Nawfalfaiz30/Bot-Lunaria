const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embed = require('../../helpers/embed');
const logger = require('../../helpers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketremove')
        .setDescription('Mengeluarkan member dari channel tiket ini.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Member yang ingin dikeluarkan dari tiket ini')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const channel = interaction.channel;

        if (!channel.name.includes('ticket')) {
            return interaction.reply({ 
                embeds: [embed.error(interaction.user, 'Gagal', 'Perintah ini hanya bisa digunakan di dalam channel Tiket!')], 
                ephemeral: true 
            });
        }

        try {
            // Mencabut izin melihat channel
            await channel.permissionOverwrites.edit(user.id, {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false
            });

            await interaction.reply({ 
                embeds: [embed.success(interaction.user, 'Member Dikeluarkan', `Berhasil mengeluarkan <@${user.id}> dari tiket ini.`)] 
            });

        } catch (error) {
            logger.error(`[TICKET REMOVE ERROR] Gagal mengeluarkan user di ${channel.id}`, error);
            await interaction.reply({ embeds: [embed.error(interaction.user, 'Error', 'Gagal mengubah izin channel.')], ephemeral: true });
        }
    }
};