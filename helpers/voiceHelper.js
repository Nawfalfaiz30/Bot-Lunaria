const embed = require('./embed.js');

// Menggunakan Map untuk menyimpan data sementara { channelId: ownerId }
// Ini akan mencatat siapa pembuat (pemilik) dari Voice Channel tersebut.
const voiceOwners = new Map();

module.exports = {
    // Mengekspor Map agar bisa diakses dan dimodifikasi dari event (voiceStateUpdate)
    voiceOwners,

    /**
     * Memvalidasi apakah pengguna berada di Voice Channel miliknya sendiri.
     * Sangat berguna untuk command seperti /vclock, /vclimit, dll.
     * @param {Object} interaction - Objek interaksi Discord
     * @returns {Boolean|String} - Mengembalikan ID channel jika valid, false jika gagal.
     */
    isVoiceOwner: async (interaction) => {
        const memberVoice = interaction.member.voice.channel;

        // 1. Cek apakah pengguna sedang berada di dalam Voice Channel
        if (!memberVoice) {
            await interaction.reply({
                embeds: [embed.error(interaction.user, 'Akses Ditolak', 'Kamu harus berada di dalam Voice Channel untuk menggunakan perintah ini!')],
                ephemeral: true
            });
            return false;
        }

        // 2. Cek apakah Voice Channel tersebut ada di daftar Private VC (dibuat oleh sistem)
        const ownerId = voiceOwners.get(memberVoice.id);
        if (!ownerId) {
            await interaction.reply({
                embeds: [embed.error(interaction.user, 'Bukan Private VC', 'Ini bukan Voice Channel sementara (Private VC). Kamu tidak bisa mengaturnya.')],
                ephemeral: true
            });
            return false;
        }

        // 3. Cek apakah pengguna adalah pemilik sejati dari Voice Channel tersebut
        // Pengecualian: Admin server (Administrator) bisa mem-bypass sistem ini
        const isAdmin = interaction.member.permissions.has('Administrator');
        if (ownerId !== interaction.user.id && !isAdmin) {
            await interaction.reply({
                embeds: [embed.error(interaction.user, 'Akses Ditolak', `Hanya pembuat Voice Channel ini (<@${ownerId}>) yang memiliki izin untuk mengubah pengaturannya!`)],
                ephemeral: true
            });
            return false;
        }

        // Jika semua lolos, kembalikan ID Voice Channel
        return memberVoice;
    },

    /**
     * Mentransfer kepemilikan Voice Channel ke orang lain (Untuk /vcclaim atau saat owner keluar)
     * @param {String} channelId - ID dari Voice Channel
     * @param {String} newOwnerId - ID pengguna Discord yang baru
     */
    transferOwnership: (channelId, newOwnerId) => {
        if (voiceOwners.has(channelId)) {
            voiceOwners.set(channelId, newOwnerId);
            return true;
        }
        return false;
    }
};