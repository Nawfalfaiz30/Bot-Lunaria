const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    // Bank kata bertema RPG/Game (bisa kamu perluas sesukamu)
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

    await interaction.reply({ embeds: [getStatusEmbed()] });

    // Kolektor pesan untuk menangkap ketikan huruf dari si pengguna
    const filter = m => m.author.id === interaction.user.id && m.content.length === 1 && /[a-zA-Z]/.test(m.content);
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
            
            await interaction.editReply({ embeds: [winEmbed] });
            return collector.stop();
        }

        if (lives <= 0) {
            const loseEmbed = getStatusEmbed()
                .setTitle('❌ Game Over!')
                .setColor('#ED4245')
                .setDescription(`Nyawa habis! Gantungannya terpasang...\nKata asli yang tersembunyi: **${secretWord}**`);
            
            await interaction.editReply({ embeds: [loseEmbed] });
            return collector.stop();
        }

        // Update papan status embed setiap tebakan baru masuk
        await interaction.editReply({ embeds: [getStatusEmbed()] });
    });
};