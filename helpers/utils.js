module.exports = {
    /**
     * Menghentikan eksekusi kode sementara (Sleep/Delay).
     * Berguna untuk memberi jeda sebelum bot mengirim pesan berikutnya.
     * @param {number} ms - Milidetik (1000 = 1 detik)
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Menghasilkan angka acak di antara nilai minimum dan maksimum (inklusif).
     * Ini adalah jantung dari sistem RNG (Random Number Generator) RPG kita.
     * @param {number} min - Angka terkecil
     * @param {number} max - Angka terbesar
     */
    getRandomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Memformat angka menjadi format ribuan agar mudah dibaca.
     * Contoh: 10000000 menjadi 10.000.000
     * @param {number} number - Angka yang ingin diformat
     */
    formatNumber: (number) => {
        if (!number) return "0";
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    /**
     * Membuat huruf pertama dari sebuah teks menjadi huruf kapital.
     * Contoh: "pedang besi" menjadi "Pedang besi"
     * @param {string} string - Teks asli
     */
    capitalize: (string) => {
        if (!string) return "";
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    },

    /**
     * Memecah Array besar menjadi beberapa Array kecil (Chunks).
     * Sangat wajib untuk fitur Pagination (Halaman) seperti Leaderboard atau Inventory.
     * Contoh: Array berisi 50 item, dipecah menjadi 5 halaman berisi 10 item.
     * @param {Array} array - Array yang ingin dipecah
     * @param {number} size - Jumlah maksimal item per halaman/potongan
     */
    chunkArray: (array, size) => {
        const chunked = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    },

    /**
     * Mengambil satu elemen acak dari dalam sebuah Array.
     * Berguna untuk memilih quotes acak, atau memilih pemenang giveaway.
     * @param {Array} array - Daftar pilihan
     */
    getRandomElement: (array) => {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Mengubah milidetik menjadi format waktu yang mudah dibaca.
     * Contoh hasil: "2 Hari, 4 Jam, 30 Menit" (Berguna untuk sistem Cooldown)
     * @param {number} ms - Waktu dalam milidetik
     */
    parseMilliseconds: (ms) => {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        
        let timeString = [];
        if (days > 0) timeString.push(`${days} Hari`);
        if (hours > 0) timeString.push(`${hours} Jam`);
        if (minutes > 0) timeString.push(`${minutes} Menit`);
        if (seconds > 0) timeString.push(`${seconds} Detik`);
        
        return timeString.join(', ') || "0 Detik";
    }
};