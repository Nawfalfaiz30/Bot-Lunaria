const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RpgDB = require('../../../models/rpgSchema');
const embed = require('../../../helpers/embed');

module.exports = {
    name: 'rpgskills',
    aliases: ['skills', 'skill', 'kemampuan'],
    data: new SlashCommandBuilder()
        .setName('rpgskills')
        .setDescription('Melihat buku skill dan kemampuan dari Class kamu.'),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction) delete options.ephemeral;
            return await context.reply(options);
        };

        const player = await RpgDB.findOne({ userId: userExecutor.id });
        
        if (!player || !player.class || player.class === 'Novice') {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Tidak Ada Skill', `Kamu belum memiliki spesialisasi Class. Capai Level 5 dan gunakan \`${isInteraction ? '/rpgclass' : '!rpgclass'}\` terlebih dahulu untuk memilih jalanmu.`)], 
                ephemeral: true 
            });
        }

        const skillEmbed = new EmbedBuilder()
            .setAuthor({ name: `Buku Skill: ${userExecutor.username}`, iconURL: userExecutor.displayAvatarURL({ dynamic: true }) })
            .setColor('#2980b9')
            .setDescription(`**Class:** ${player.class}\nBerikut adalah kemampuan pasif yang aktif secara otomatis saat kamu bertarung:\n\n`);

        if (player.class === 'Warrior') {
            skillEmbed.addFields(
                { name: '🛡️ Pasif: Iron Will', value: 'Jika HP turun di bawah 20%, Defense akan otomatis meningkat sebesar 50% untuk bertahan hidup.' },
                { name: '⚔️ Pasif: Heavy Strike', value: 'Setiap serangan fisik memiliki 10% peluang memberikan 2x lipat Damage mematikan.' }
            );
        } else if (player.class === 'Mage') {
            skillEmbed.addFields(
                { name: '🔮 Pasif: Mana Shield', value: 'Setiap serangan (Damage) yang diterima akan memotong persediaan Mana sebesar 5% sebelum mengurangi HP tubuh.' },
                { name: '🔥 Pasif: Spell Echo', value: 'Memiliki 15% peluang untuk merapal mantra sihir 2 kali berturut-turut dalam satu giliran.' }
            );
        } else if (player.class === 'Archer') {
            skillEmbed.addFields(
                { name: '🏹 Pasif: Eagle Eye', value: 'Peluang untuk mendaratkan Serangan Kritis (Critical Hit) meningkat sebesar 20%.' },
                { name: '💨 Pasif: Swift Evasion', value: 'Kelincahan tinggi memberikan 15% peluang untuk menghindari serangan musuh secara total (Miss).' }
            );
        }

        await sendResponse({ embeds: [skillEmbed] });
    }
};