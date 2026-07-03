const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tod',
    aliases: ['truthordare'],
    data: new SlashCommandBuilder()
        .setName('tod')
        .setDescription('Bermain Truth or Dare (Jujur atau Tantangan) bersama teman-temanmu')
        // Subcommand: Truth
        .addSubcommand(subcmd =>
            subcmd.setName('truth')
                .setDescription('Dapatkan pertanyaan kejujuran yang menantang')
        )
        // Subcommand: Dare
        .addSubcommand(subcmd =>
            subcmd.setName('dare')
                .setDescription('Dapatkan tantangan seru yang harus kamu lakukan')
        ),

    async execute(context, args, client) {
        // 1. Deteksi jenis subcommand (Slash vs Prefix)
        let subcommand = '';

        if (context.options) {
            // Jalur Slash Command
            subcommand = context.options.getSubcommand();
        } else {
            // Jalur Prefix chat biasa
            if (!args || args.length === 0) {
                return context.reply({ 
                    content: '❌ Silakan tentukan mode bermain! Contoh: `ln tod truth` atau `ln tod dare`.' 
                });
            }
            subcommand = args[0].toLowerCase();
        }

        // Ambil ID pengguna secara fleksibel tergantung objek context
        const userId = context.user ? context.user.id : context.author.id;

        const truthList = [
            "Apa kebohongan terbesar yang pernah kamu katakan kepada orang tuamu?", // 1
            "Siapa orang di server ini yang diam-diam kamu sukai atau kagumi?", // 2
            "Apa kebiasaan paling aneh atau memalukan yang kamu lakukan saat sendirian?", // 3
            "Apa hal paling konyol yang pernah kamu lakukan demi menarik perhatian seseorang?", // 4
            "Jika kamu bisa bertukar nasib dengan salah satu anggota di sini selama sehari, siapa yang kamu pilih?", // 5
            "Apa penyesalan terbesar yang masih sering kamu pikirkan sampai sekarang?", // 6
            "Kapan terakhir kali kamu menangis dan apa alasan di baliknya?", // 7
            "Siapa karakter anime yang diam-diam menjadi waifu/husbando impian terbesarmu?", // 8
            "Apa anime terburuk atau paling memalukan yang pernah kamu tonton sampai habis?", // 9
            "Pernahkah kamu meniru gerakan atau jurus anime di dunia nyata secara sembunyi-sembunyi? Ceritakan!", // 10
            "Apa sifat atau kelakuan burukmu di server ini yang belum pernah diketahui orang lain?", // 11
            "Jika kamu terpaksa harus memblokir (block) satu orang di server ini demi uang 1 juta, siapa yang akan kamu korbankan?", // 12
            "Apa hal pertama yang kamu cari saat membuka riwayat pencarian (history) browser internetmu?", // 13
            "Apakah kamu pernah berpura-pura sibuk atau pura-pura AFK hanya demi menghindari obrolan seseorang di Discord?", // 14
            "Apa mimpi paling aneh atau absurd yang pernah kamu alami dan masih kamu ingat jelas?" // 15
        ];

        const dareList = [
            "Kirimkan pesan teks acak (random) ke DM orang pertama yang ada di daftar online server ini.", // 1
            "Ganti nama tampilan (nickname) kamu di server ini menjadi 'Badut Server' selama 1 jam ke depan.", // 2
            "Kirimkan screenshot isi galeri foto terakhir di handphone/PC kamu ke chat umum sekarang.", // 3
            "Nyanyikan reff dari lagu favoritmu lewat voice channel (VC) atau kirim VN (Voice Note) singkat di chat.", // 4
            "Ucapkan gombalan paling maut kepada salah satu admin atau moderator di server ini.", // 5
            "Gunakan foto profil (avatar) bertema anime/karakter pilihan orang di sebelahmu selama 24 jam.", // 6
            "Ketik pesan menggunakan huruf kapital (Caps Lock) semua di chat umum selama 10 menit ke depan tanpa henti.", // 7
            "Kirim pesan ke chat umum menggunakan gaya bicara karakter anime (seperti menambahkan kata '-desu', '-nya', atau berlagak tsundere) selama 15 menit ke depan.", // 8
            "Ganti status custom status Discord kamu menjadi 'Saya cinta berat sama [mention/tulis nama member random di server]' selama 2 jam.", // 9
            "DM salah satu admin/moderator dan tanyakan dengan sangat serius: 'Apakah kamu mau menjadi guru spiritualku?' tanpa memberikan penjelasan setelahnya.", // 10
            "Kirimkan foto meme anime paling garing atau 'cringe' yang ada di penyimpananmu ke channel chat umum sekarang.", // 11
            "Hapus foto profil (avatar) Discord kamu atau gunakan avatar bawaan (default blank) Discord selama 1 jam ke depan.", // 12
            "Ketik sebuah kalimat gombalan buatanmu sendiri lalu kirimkan ke DM orang terakhir yang mengirim pesan di channel umum sebelum kamu.", // 13
            "Berikan reaksi (react emoji) badut 🤡 pada 10 pesan terakhir yang dikirim oleh orang yang berbeda-beda di chat room.", // 14
            "Ping (@mention) salah satu staf server yang sedang online lalu katakan 'Aku tahu rahasiamu...' dan langsung matikan status menjadi Invisible." // 15
        ];
        let selectedText = '';
        let title = '';
        let color = '';

        if (subcommand === 'truth') {
            selectedText = truthList[Math.floor(Math.random() * truthList.length)];
            title = '🔮 Lunaria ToD: TRUTH (Kejujuran)';
            color = '#3498DB';
        } else if (subcommand === 'dare') {
            selectedText = dareList[Math.floor(Math.random() * dareList.length)];
            title = '🔥 Lunaria ToD: DARE (Tantangan)';
            color = '#E74C3C';
        } else {
            // Penanganan jika user mengetik argumen di luar truth/dare via prefix
            return context.reply({ content: '❌ Pilihan tidak valid! Pilih antara `truth` atau `dare`.' });
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`**Pertanyaan/Tantangan untuk <@${userId}>:**\n\n"${selectedText}"`)
            .setColor(color)
            .setFooter({ text: 'Jawab dengan jujur atau lakukan tantangannya dengan berani!' })
            .setTimestamp();

        await context.reply({ embeds: [embed] });
    }
};