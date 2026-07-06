const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction, args) => {
    // Deteksi apakah dijalankan lewat Slash Command atau Prefix Command
    const isInteraction = !interaction.author;
    let userChoice = '';

    if (isInteraction) {
        // Jalur jika dipanggil via Slash Command
        userChoice = interaction.options.getString('pilihan');
    } else {
        // Jalur jika dipanggil via Prefix Command (Teks Biasa)
        if (args && args[0]) {
            userChoice = args[0].toLowerCase();
        } else {
            // Scan otomatis dari isi konten chat jika args tidak ter-passing
            const words = interaction.content.toLowerCase().split(/ +/);
            userChoice = words.find(w => ['batu', 'kertas', 'gunting'].includes(w)) || '';
        }
    }

    const botChoices = ['batu', 'kertas', 'gunting'];

    // Validasi pilihan input pengguna
    if (!userChoice || !botChoices.includes(userChoice)) {
        const errorContent = '⚠️ Pilihan tidak valid! Harap pilih antara: `batu`, `kertas`, atau `gunting`.\nContoh: `!rps batu` atau via Slash Command `/rps`';
        return interaction.reply({ content: errorContent, ephemeral: isInteraction });
    }

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