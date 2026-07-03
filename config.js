    module.exports = {
    // Prefix bawaan jika server belum mengatur prefix custom
    defaultPrefix: 'ln!',

    // ID Discord Anda (Developer). Berguna untuk membatasi perintah berbahaya (seperti /eval)
    developerIds: ['676785487825862667'],

    // Palet warna standar untuk helpers/embed.js
    embedColors: {
        primary: '#2b2d31', // Warna gelap modern (menyatu dengan tema dark mode Discord)
        success: '#57F287', // Hijau (Berhasil)
        error: '#ED4245',   // Merah (Gagal/Error)
        warning: '#FEE75C'  // Kuning (Peringatan/Timeout)
    },

    // Pengaturan modul musik (DisTube)
    music: {
        // Cookie YouTube diperlukan agar bot tidak diblokir/rate-limit oleh YouTube.
        // Biarkan string kosong untuk saat ini, bisa diisi nanti jika mengalami kendala pemutaran.
        youtubeCookie: '' 
    }
};