const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    const rows = 6;
    const cols = 6;
    const minesCount = 7;

    // 1. Inisialisasi papan kosong
    let board = Array(rows).fill(null).map(() => Array(cols).fill(0));

    // 2. Taruh bom secara acak
    let placedMines = 0;
    while (placedMines < minesCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (board[r][c] !== '💥') {
            board[r][c] = '💥';
            placedMines++;
        }
    }

    // 3. Hitung angka indikator di sekitar bom
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c] === '💥') continue;
            let count = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (board[r + i] && board[r + i][c + j] === '💥') count++;
                }
            }
            const numberEmojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
            board[r][c] = numberEmojis[count];
        }
    }

    // 4. Bungkus papan ke dalam format teks spoiler Discord (||emoji||)
    const stringBoard = board.map(row => row.map(cell => `||${cell}||`).join('')).join('\n');

    const embed = new EmbedBuilder()
        .setTitle('💣 Lunaria Minesweeper')
        .setDescription(`Klik/tekan kotak abu-abu di bawah untuk membuka zona aman!\nTotal Bom Tersembunyi: **${minesCount}**\n\n${stringBoard}`)
        .setColor('#2F3136')
        .setFooter({ text: 'Hati-hati, jangan sampai tersenggol bom! 💥' });

    // Kita kirim secara publik (bukan ephemeral) agar member lain bisa ikut gregetan melihat hasilnya
    await interaction.reply({ embeds: [embed] });
};