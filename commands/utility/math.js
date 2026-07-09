    const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
    const embed = require('../../helpers/embed');

    module.exports = {
        name: 'math',
        aliases: ['calc', 'hitung'],
        data: new SlashCommandBuilder()
            .setName('math')
            .setDescription('Menghitung operasi matematika dasar dasar.')
            .addStringOption(option => option.setName('ekspresi').setDescription('Contoh: 5 * 5 + 10').setRequired(true)),

        async execute(context, args, client) {
            const isSlash = context.options !== undefined;
            const expression = isSlash ? context.options.getString('ekspresi') : args.join(' ');
            const author = isSlash ? context.user : context.author;

            if (!expression) return context.reply({ content: 'Masukkan rumus ekspresi angkanya!', ephemeral: true });

            // Pembersihan karakter berbahaya demi alasan keamanan sandbox
            const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');

            try {
                // Evaluasi aritmatika aman
                const result = new Function(`return ${sanitizedExpression}`)();

                const mathEmbed = new EmbedBuilder()
                    .setTitle('🧮 Hasil Kalkulasi')
                    .setColor('#f1c40f')
                    .addFields(
                        { name: '📥 Soal', value: `\`\`\`${expression}\`\`\`` },
                        { name: '📤 Jawaban', value: `\`\`\`${result}\`\`\`` }
                    );

                await context.reply({ embeds: [mathEmbed] });
            } catch (error) {
                await context.reply({ embeds: [embed.error(author, 'Gagal Hitung', 'aEkspresi matematika tidak valid.')], ephemeral: true });
            }
        }
    };