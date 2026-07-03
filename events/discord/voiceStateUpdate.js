const { ChannelType, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSchema');
const { voiceOwners } = require('../../helpers/voiceHelper');
const logger = require('../../helpers/logger');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState, client) {
        try {
            // 1. Cek konfigurasi J2C (Join-to-Create) dari Database
            const guildData = await GuildSettings.findOne({ guildId: newState.guild.id });
            if (!guildData || !guildData.voiceGeneratorChannel) return;

            const generatorChannelId = guildData.voiceGeneratorChannel;

            // --- A. LOGIKA MEMBUAT ROOM (MEMBER JOIN) ---
            if (newState.channelId === generatorChannelId) {
                const member = newState.member;
                const guild = newState.guild;
                const categoryId = newState.channel.parentId; // Ambil kategori dari channel J2C

                // Buat Voice Channel Baru
                const newChannel = await guild.channels.create({
                    name: `🔊 Room ${member.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: member.id, // Berikan hak akses penuh kepada pembuatnya
                            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers]
                        }
                    ]
                });

                // Pindahkan member ke channel yang baru dibuat
                await member.voice.setChannel(newChannel);

                // Simpan kepemilikan ke dalam Map di voiceHelper
                voiceOwners.set(newChannel.id, member.id);
            }

            // --- B. LOGIKA MENGHAPUS ROOM (MEMBER LEFT) ---
            // Jika member keluar dari Voice Channel lama
            if (oldState.channelId && oldState.channelId !== newState.channelId) {
                const oldChannel = oldState.channel;

                // Cek apakah channel lama adalah Private Room buatan bot
                if (oldChannel && voiceOwners.has(oldChannel.id)) {
                    // Jika room kosong (tidak ada orang), hapus channel-nya
                    if (oldChannel.members.size === 0) {
                        await oldChannel.delete().catch(() => null);
                        voiceOwners.delete(oldChannel.id); // Hapus dari memori
                    }
                }
            }

        } catch (error) {
            logger.error(`[VOICE STATE ERROR] Gagal mengelola Private VC`, error);
        }
    }
};