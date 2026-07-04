const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    // Ambil data user secara aman (mendukung Slash Command maupun Prefix/Message Command)
    const targetUser = interaction.user || interaction.author;
    if (!targetUser) return; // Proteksi jika tidak ada user valid yang terdeteksi
    const userId = targetUser.id;

    // Bank kata bertema RPG/Game
    const wordList = [
        'NARUTO', 'ONEPIECE', 'BLEACH', 'SHINIGAMI', 'SAITAMA',
        'SHINGEKI', 'SUKUNA', 'GOJO', 'OTAKU', 'KAIJU',
        'TSUNDERE', 'SHONEN', 'ISEKAI', 'CHIDORI', 'RASENGAN',
        'SHARINGAN', 'KAMEHAMEHA', 'ZORO', 'SHIBUYA', 'AKATSUKI'
    ];
    const secretWord = wordList[Math.floor(Math.random() * wordList.length)];
    let guessedLetters = [];
    let lives = 6;

    // Fungsi pembantu menampilkan huruf yang tertebak
    const displayWord = () => secretWord.split('').map(l => guessedLetters.includes(l) ? l : '\\_').join(' ');

    const getStatusEmbed = () => {
        return new EmbedBuilder()
            .setTitle('🪓 Lunaria Hangman')
            .setDescription(`Kata Misteri: **${displayWord()}**\n\nSisa Nyawa: ❤️ \`${lives}\` \nHuruf Salah: [ ${guessedLetters.filter(l => !secretWord.includes(l)).join(', ') || '-'} ]`)
            .setColor(lives > 2 ? '#5865F2' : '#ED4245')
            .setFooter({ text: 'Ketik satu huruf di room chat ini untuk menebak!' });
    };

    // Mengirim respons awal secara aman
    let initialMessage;
    if (interaction.replied || interaction.deferred) {
        initialMessage = await interaction.followUp({ embeds: [getStatusEmbed()], fetchReply: true });
    } else {
        initialMessage = await interaction.reply({ embeds: [getStatusEmbed()], fetchReply: true });
    }

    // Kolektor pesan untuk menangkap ketikan huruf dari si pengguna
    // Ditambahkan pengecekan menyeluruh (m?.author?.id) untuk mencegah crash "undefined"
    const filter = m => m && m.author?.id === userId && m.content?.length === 1 && /[a-zA-Z]/.test(m.content);
    const collector = interaction.channel.createMessageCollector({ filter, time: 120000 }); // batas waktu 2 menit

    collector.on('collect', async m => {
        const char = m.content.toUpperCase();
        
        // Hapus chat tebakan user agar room tidak penuh sampah teks satu huruf
        try { await m.delete(); } catch (e) {}

        if (guessedLetters.includes(char)) return;
        guessedLetters.push(char);

        // Jika huruf salah, kurangi nyawa
        if (!secretWord.includes(char)) {
            lives--;
        }

        const isWin = secretWord.split('').every(l => guessedLetters.includes(l));

        if (isWin) {
            const winEmbed = getStatusEmbed()
                .setTitle('🎉 Selamat, Kamu Menang!')
                .setColor('#57F287')
                .setDescription(`Kamu berhasil menyelamatkan om Hangman!\nKata yang benar adalah: **${secretWord}**`);
            
            if (interaction.editReply) {
                await interaction.editReply({ embeds: [winEmbed] });
            } else {
                await initialMessage.edit({ embeds: [winEmbed] });
            }
            return collector.stop();
        }

        if (lives <= 0) {
            const loseEmbed = getStatusEmbed()
                .setTitle('❌ Game Over!')
                .setColor('#ED4245')
                .setDescription(`Nyawa habis! Gantungannya terpasang...\nKata asli yang tersembunyi: **${secretWord}**`);
            
            if (interaction.editReply) {
                await interaction.editReply({ embeds: [loseEmbed] });
            } else {
                await initialMessage.edit({ embeds: [loseEmbed] });
            }
            return collector.stop();
        }

        // Update papan status embed setiap tebakan baru masuk
        if (interaction.editReply) {
            await interaction.editReply({ embeds: [getStatusEmbed()] });
        } else {
            await initialMessage.edit({ embeds: [getStatusEmbed()] });
        }
    });
};