const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async (context) => {
    // 1. Identifikasi Pemain 1 (Tantang) & Pemain 2 (Lawan)
    const player1 = context.user || context.author;
    let player2 = null;

    if (context.options) {
        player2 = context.options.getUser('lawan');
    } else {
        // Ambil dari mention chat biasa (ln fun tictactoe @user)
        player2 = context.mentions.users.first();
    }

    if (!player2) {
        return context.reply({ content: '❌ Kamu harus menyebutkan (@mention) lawan mainmu! Contoh: `ln fun tictactoe @teman`' });
    }

    if (player2.id === player1.id) {
        return context.reply({ content: '❌ Kamu tidak bisa menantang dirimu sendiri!' });
    }

    if (player2.bot) {
        return context.reply({ content: '❌ Kamu tidak bisa bermain melawan bot untuk game ini!' });
    }

    // Inisialisasi Papan Game (9 kotak kosong)
    let board = Array(9).fill(null);
    let turn = player1; // Player 1 jalan duluan (X)

    const getComponents = () => {
        const rows = [];
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 3; j++) {
                const index = i * 3 + j;
                const button = new ButtonBuilder()
                    .setCustomId(`ttt_${index}`)
                    .setLabel(board[index] || '➖')
                    .setStyle(board[index] === '❌' ? ButtonStyle.Danger : board[index] === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary);
                row.addComponents(button);
            }
            rows.push(row);
        }
        return rows;
    };

    const makeEmbed = (statusText) => {
        return new EmbedBuilder()
            .setTitle('❌ Tic-Tac-Toe ⭕')
            .setDescription(`**Pemain 1:** <@${player1.id}> (❌)\n**Pemain 2:** <@${player2.id}> (⭕)\n\n${statusText}`)
            .setColor('#2F3136')
            .setTimestamp();
    };

    const msg = await context.reply({ 
        embeds: [makeEmbed(`Giliran saat ini: <@${turn.id}>`)], 
        components: getComponents(),
        fetchReply: true 
    });

    const checkWin = () => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertikal
            [0, 4, 8], [2, 4, 6]             // Diagonal
        ];
        for (const line of lines) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        if (board.every(cell => cell !== null)) return 'tie';
        return null;
    };

    const filter = i => i.customId.startsWith('ttt_') && (i.user.id === player1.id || i.user.id === player2.id);
    const collector = context.channel.createMessageComponentCollector({ filter, time: 300000 }); // 5 menit

    collector.on('collect', async i => {
        if (i.user.id !== turn.id) {
            return i.reply({ content: '❌ Ini bukan giliranmu!', ephemeral: true });
        }

        const index = parseInt(i.customId.split('_')[1]);
        if (board[index]) {
            return i.reply({ content: '❌ Kotak ini sudah diisi!', ephemeral: true });
        }

        board[index] = turn.id === player1.id ? '❌' : '⭕';
        await i.deferUpdate();

        const winner = checkWin();
        if (winner) {
            collector.stop();
            let status = '';
            if (winner === 'tie') status = '📊 **Hasil Game: Seri/Imbang!**';
            else status = `🎉 **Selamat! <@${turn.id}> memenangkan permainan!**`;

            const disabledRows = getComponents().map(row => {
                row.components.forEach(btn => btn.setDisabled(true));
                return row;
            });

            return context.options ? 
                await context.editReply({ embeds: [makeEmbed(status)], components: disabledRows }) : 
                await msg.edit({ embeds: [makeEmbed(status)], components: disabledRows });
        }

        // Ganti giliran
        turn = turn.id === player1.id ? player2 : player1;
        
        if (context.options) {
            await context.editReply({ embeds: [makeEmbed(`Giliran saat ini: <@${turn.id}>`)], components: getComponents() });
        } else {
            await msg.edit({ embeds: [makeEmbed(`Giliran saat ini: <@${turn.id}>`)], components: getComponents() });
        }
    });
};