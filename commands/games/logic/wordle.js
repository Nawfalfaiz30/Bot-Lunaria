const { EmbedBuilder } = require('discord.js');

module.exports = async (context) => {
    // 1. Bank kata Anime dengan panjang huruf yang bervariasi
    const words = [
        'ANIME', 'OTAKU', 'MANGA', 'NARUTO', 'LUPIN',
        'BORUTO', 'BLEACH', 'SAITAMA', 'ZORO', 'SANJI',
        'LUFFY', 'NAMI', 'ROBIN', 'GOKU', 'VEGETA',
        'GOJO', 'SUKUNA', 'MEGUMI', 'EREN', 'MIKASA'
    ];
    const targetWord = words[Math.floor(Math.random() * words.length)];
    const wordLength = targetWord.length; // Mengambil panjang huruf dinamis
    
    let attempts = 0;
    const maxAttempts = 6;
    
    // 2. Generate baris kotak abu-abu otomatis mengikuti panjang kata
    let gameBoard = Array(maxAttempts).fill('⬜ '.repeat(wordLength).trim());
    
    // Identifikasi user ID baik dari Slash (interaction) maupun Prefix (message)
    const authorId = context.user ? context.user.id : context.author.id;

    const embed = new EmbedBuilder()
        .setTitle('🔮 Lunaria Wordle')
        .setDescription(`Tebak kata **${wordLength} huruf** bertema Anime!\nGunakan chat room ini untuk mengetik tebakanmu.\n\n${gameBoard.join('\n')}`)
        .setColor('#5865F2')
        .setFooter({ text: `Kesempatan: ${attempts}/${maxAttempts}` });

    // Kirim respons awal menggunakan context universal
    const msg = await context.reply({ embeds: [embed], fetchReply: true });

    // 3. Filter pesan disesuaikan dengan pengirim dan panjang huruf targetWord
    const filter = m => m.author.id === authorId && m.content.length === wordLength && new RegExp(`^[a-zA-Z]{${wordLength}}$`).test(m.content);
    const collector = context.channel.createMessageCollector({ filter, time: 60000 * 5 }); // Batas waktu 5 menit

    collector.on('collect', async m => {
        if (attempts >= maxAttempts) return collector.stop('lose');
        
        const guess = m.content.toUpperCase();
        let rowResult = [];
        
        // Hapus pesan tebakan user agar text channel tetap rapi
        try { await m.delete(); } catch (e) {}

        // 4. Logika pencocokan huruf dinamis ala Wordle
        for (let i = 0; i < wordLength; i++) {
            if (guess[i] === targetWord[i]) {
                rowResult.push('🟩'); // Huruf benar & posisi benar
            } else if (targetWord.includes(guess[i])) {
                rowResult.push('🟨'); // Huruf ada di dalam kata, tapi posisi salah
            } else {
                rowResult.push('⬛'); // Huruf tidak ada di dalam kata
            }
        }

        gameBoard[attempts] = rowResult.join(' ');
        attempts++;

        const updatedEmbed = new EmbedBuilder()
            .setTitle('🔮 Lunaria Wordle')
            .setDescription(`${gameBoard.join('\n')}`)
            .setColor('#5865F2')
            .setFooter({ text: `Kesempatan: ${attempts}/${maxAttempts}` });

        // Kondisi jika MENANG
        if (guess === targetWord) {
            updatedEmbed.setColor('#57F287').addFields({ 
                name: 'Selamat 🎉', 
                value: `Kamu berhasil menebak kata misteri: **${targetWord}**!` 
            });
            
            if (context.options) {
                await context.editReply({ embeds: [updatedEmbed] });
            } else {
                await msg.edit({ embeds: [updatedEmbed] });
            }
            return collector.stop('win');
        }

        // Kondisi jika KALAH (Kesempatan habis)
        if (attempts >= maxAttempts) {
            updatedEmbed.setColor('#ED4245').addFields({ 
                name: 'Game Over ❌', 
                value: `Kesempatan habis! Kata yang benar adalah **${targetWord}**.` 
            });

            if (context.options) {
                await context.editReply({ embeds: [updatedEmbed] });
            } else {
                await msg.edit({ embeds: [updatedEmbed] });
            }
            return collector.stop('lose');
        }

        // Update board untuk tebakan berikutnya
        if (context.options) {
            await context.editReply({ embeds: [updatedEmbed] });
        } else {
            await msg.edit({ embeds: [updatedEmbed] });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('🔮 Lunaria Wordle: Waktu Habis')
                .setDescription(`Sesi game berakhir karena tidak ada respons.\nKata aslinya adalah **${targetWord}**.`)
                .setColor('#4F545C');
            
            if (context.options) {
                await context.editReply({ embeds: [timeoutEmbed] });
            } else {
                await msg.edit({ embeds: [timeoutEmbed] });
            }
        }
    });
};