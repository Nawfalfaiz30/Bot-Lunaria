const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    /**
     * Membuat Kartu Welcome / Goodbye (Selamat Datang / Selamat Tinggal)
     * @param {Object} member - Objek dari GuildMember Discord
     * @param {String} type - "WELCOME" atau "GOODBYE"
     * @returns {Buffer} - Data gambar mentah yang siap dikirim Discord
     */
    createWelcomeCard: async (member, type = "WELCOME") => {
        // 1. Siapkan Kanvas (Lebar: 1024px, Tinggi: 450px)
        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        // 2. Gambar Latar Belakang (Background)
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a2a6c');
        gradient.addColorStop(0.5, '#b21f1f');
        gradient.addColorStop(1, '#fdbb2d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Efek bayangan/gelap sedikit agar teks terbaca jelas
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Muat Foto Profil (Avatar) Pengguna
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);

        // 4. Menggambar Foto Profil Menjadi Lingkaran
        const avatarX = canvas.width / 2;
        const avatarY = 170;
        const avatarRadius = 100;
        
        ctx.save(); // Simpan kondisi kanvas sebelum dipotong
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip(); // Memotong area menjadi lingkaran
        ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore(); // Kembalikan kondisi kanvas

        // Gambar bingkai (border) putih untuk foto profil
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.stroke();

        // 5. Menggambar Teks
        ctx.textAlign = 'center';

        // Teks Tipe (WELCOME / GOODBYE)
        ctx.font = 'bold 50px sans-serif';
        ctx.fillStyle = '#ffffff';
        const titleText = type === "WELCOME" ? "W E L C O M E" : "G O O D B Y E";
        ctx.fillText(titleText, canvas.width / 2, 340);

        // Teks Username
        ctx.font = 'bold 35px sans-serif';
        ctx.fillStyle = '#f1c40f'; // Warna kuning
        ctx.fillText(member.user.username.toUpperCase(), canvas.width / 2, 390);

        // Teks Urutan Member (Hanya untuk Welcome)
        if (type === "WELCOME") {
            ctx.font = '25px sans-serif';
            ctx.fillStyle = '#bdc3c7';
            ctx.fillText(`Kamu adalah member ke-${member.guild.memberCount}!`, canvas.width / 2, 430);
        }

        // Kembalikan dalam bentuk Buffer format PNG
        return canvas.toBuffer('image/png');
    },

    /**
     * Membuat filter "WASTED" khas game GTA (Hitam Putih + Teks Merah)
     * @param {String} avatarURL - URL foto yang ingin diedit
     * @returns {Buffer} - Data gambar mentah
     */
    createWastedOverlay: async (avatarURL) => {
        const size = 512;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // Muat gambar
        const avatar = await loadImage(avatarURL);
        ctx.drawImage(avatar, 0, 0, size, size);

        // Algoritma Hitam Putih (Greyscale)
        const imgData = ctx.getImageData(0, 0, size, size);
        const pixels = imgData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const lightness = (pixels[i] * 0.299) + (pixels[i + 1] * 0.587) + (pixels[i + 2] * 0.114);
            pixels[i] = lightness;     // Red
            pixels[i + 1] = lightness; // Green
            pixels[i + 2] = lightness; // Blue
        }
        ctx.putImageData(imgData, 0, 0);

        // Tambahkan efek gelap transparan
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, size, size);

        // Tulis "WASTED" di tengah
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 80px sans-serif';
        
        // Teks warna merah dengan garis tepi hitam
        ctx.fillStyle = '#c0392b';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        
        ctx.strokeText('W A S T E D', size / 2, size / 2);
        ctx.fillText('W A S T E D', size / 2, size / 2);

        // Kembalikan dalam bentuk Buffer format PNG
        return canvas.toBuffer('image/png');
    }
};          