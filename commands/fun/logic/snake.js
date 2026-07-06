const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async (context) => {
    const author = context.user || context.author;
    const width = 10;
    const height = 8;
    
    let snake = [{ x: 4, y: 4 }];
    let apple = { x: 2, y: 2 };
    let score = 0;
    let direction = 'RIGHT';

    const generateApple = () => {
        while (true) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            if (!snake.some(segment => segment.x === x && segment.y === y)) {
                apple = { x, y };
                break;
            }
        }
    };

    const drawBoard = () => {
        let boardStr = '';
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (snake[0].x === x && snake[0].y === y) {
                    boardStr += '🐸'; // Kepala Ular
                } else if (snake.some(s => s.x === x && s.y === y)) {
                    boardStr += '🟩'; // Badan Ular
                } else if (apple.x === x && apple.y === y) {
                    boardStr += '🍎'; // Apel
                } else {
                    boardStr += '⬛'; // Area kosong
                }
            }
            boardStr += '\n';
        }
        return boardStr;
    };

    const getButtons = () => {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('snake_none1').setLabel('\u200b').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('snake_UP').setLabel('🔼').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('snake_none2').setLabel('\u200b').setStyle(ButtonStyle.Secondary).setDisabled(true)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('snake_LEFT').setLabel('◀️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('snake_DOWN').setLabel('🔽').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('snake_RIGHT').setLabel('▶️').setStyle(ButtonStyle.Primary)
            )
        ];
    };

    const embed = new EmbedBuilder()
        .setTitle('🐍 Lunaria Ular Klasik')
        .setDescription(drawBoard())
        .setColor('#57F287')
        .addFields({ name: '🍎 Skor Kamu', value: `\`${score}\` poin` })
        .setFooter({ text: 'Klik tombol di bawah untuk mengubah arah ular!' });

    let msg;
    if (context.options !== undefined) {
        await context.reply({ embeds: [embed], components: getButtons() });
        msg = await context.fetchReply();
    } else {
        msg = await context.reply({ embeds: [embed], components: getButtons() });
    }

    const filter = i => i.customId.startsWith('snake_') && i.user.id === author.id;
    const collector = context.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        const nextDir = i.customId.split('_')[1];
        
        if (nextDir === 'UP' && direction !== 'DOWN') direction = 'UP';
        if (nextDir === 'DOWN' && direction !== 'UP') direction = 'DOWN';
        if (nextDir === 'LEFT' && direction !== 'RIGHT') direction = 'LEFT';
        if (nextDir === 'RIGHT' && direction !== 'LEFT') direction = 'RIGHT';

        await i.deferUpdate();

        const head = { ...snake[0] };
        if (direction === 'UP') head.y--;
        if (direction === 'DOWN') head.y++;
        if (direction === 'LEFT') head.x--;
        if (direction === 'RIGHT') head.x++;

        if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height || snake.some(s => s.x === head.x && s.y === head.y)) {
            collector.stop('dead');
            return;
        }

        snake.unshift(head);

        if (head.x === apple.x && head.y === apple.y) {
            score++;
            generateApple();
        } else {
            snake.pop();
        }

        const gameEmbed = new EmbedBuilder()
            .setTitle('🐍 Lunaria Ular Klasik')
            .setDescription(drawBoard())
            .setColor('#57F287')
            .addFields({ name: '🍎 Skor Kamu', value: `\`${score}\` poin` });

        if (context.options !== undefined) {
            await context.editReply({ embeds: [gameEmbed] });
        } else {
            await msg.edit({ embeds: [gameEmbed] });
        }
    });

    collector.on('end', async (collected, reason) => {
        const gameOverEmbed = new EmbedBuilder()
            .setTitle('💀 Game Over!')
            .setDescription(`Ular kamu mati menabrak rintangan!\n\n**Skor Akhir:** \`${score}\` Apel 🍎`)
            .setColor('#ED4245');

        const disabledRows = getButtons().map(row => {
            row.components.forEach(btn => btn.setDisabled(true));
            return row;
        });

        if (context.options !== undefined) {
            await context.editReply({ embeds: [gameOverEmbed], components: disabledRows });
        } else {
            await msg.edit({ embeds: [gameOverEmbed], components: disabledRows });
        }
    });
};