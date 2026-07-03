const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    const userChoice = interaction.options.getString('pilihan');
    const botChoices = ['batu', 'kertas', 'gunting'];
    const botChoice = botChoices[Math.floor(Math.random() * botChoices.length)];

    const emojis = { batu: '✊ Batu', kertas: '🖐️ Kertas', gunting: '✌️ Gunting' };

    let result = '';
    let color = '#5865F2';

    if (userChoice === botChoice) {
        result = '👔 Hasilnya **Seri / Tie**!';
        color = '#4F545C';
    } else if (
        (userChoice === 'batu' && botChoice === 'gunting') ||
        (userChoice === 'kertas' && botChoice === 'batu') ||
        (userChoice === 'gunting' && botChoice === 'kertas')
    ) {
        result = '🎉 Kamu **Menang**!';
        color = '#57F287';
    } else {
        result = '❌ Kamu **Kalah**!';
        color = '#ED4245';
    }

    const embed = new EmbedBuilder()
        .setTitle('🤖 Jan-Ken-Pon! (RPS)')
        .addFields(
            { name: 'Pilihanmu', value: emojis[userChoice], inline: true },
            { name: 'Pilihan Bot', value: emojis[botChoice], inline: true },
            { name: 'Hasil Akhir', value: result }
        )
        .setColor(color);

    await interaction.reply({ embeds: [embed] });
};