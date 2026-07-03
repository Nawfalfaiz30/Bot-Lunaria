const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RpgDB = require('../../../models/rpgSchema');
const embed = require('../../../helpers/embed');

module.exports = {
    name: 'rpgrank',
    aliases: ['rank', 'rk'],
    data: new SlashCommandBuilder()
        .setName('rpgrank')
        .setDescription('Melihat pangkat dan gelarmu di dunia RPG.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Player yang ingin dilihat pangkatnya')
        ),

    async execute(context, args, client) {
        // --- POLA HYBRID ---
        const isSlash = context.options !== undefined;
        
        // Menentukan Target
        let target;
        if (isSlash) {
            target = context.options.getUser('target') || context.user;
        } else {
            // Jika Prefix, ambil dari mention pertama atau pengirim pesan
            target = context.mentions.users.first() || context.author;
        }

        // Menentukan Author (untuk Error Embed)
        const author = isSlash ? context.user : context.author;

        if (target.bot) return context.reply({ content: 'Bot tidak memiliki pangkat.', ephemeral: true });

        const player = await RpgDB.findOne({ userId: target.id });
        if (!player) {
            return context.reply({ 
                embeds: [embed.error(author, 'Belum Terdaftar', 'Player ini belum bermain RPG.')], 
                ephemeral: true 
            });
        }

        // --- Logika Rank (Sama seperti sebelumnya) ---
        let rankName = 'Novice';
        let rankColor = '#95a5a6';
        let rankIcon = '🥚';

        if (player.level >= 50) { rankName = 'Legendary Hero'; rankColor = '#f1c40f'; rankIcon = '👑'; }
        else if (player.level >= 40) { rankName = 'Mythic Adventurer'; rankColor = '#9b59b6'; rankIcon = '🦄'; }
        else if (player.level >= 30) { rankName = 'Master'; rankColor = '#e74c3c'; rankIcon = '🐉'; }
        else if (player.level >= 20) { rankName = 'Veteran'; rankColor = '#3498db'; rankIcon = '⚔️'; }
        else if (player.level >= 10) { rankName = 'Explorer'; rankColor = '#2ecc71'; rankIcon = '🗺️'; }

        const rankEmbed = new EmbedBuilder()
            .setAuthor({ name: `Peringkat: ${target.username}`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setColor(rankColor)
            .setTitle(`${rankIcon} Gelar: ${rankName}`)
            .setDescription(`Saat ini berada di **Level ${player.level}**.\nTerus berburu dan selesaikan quest untuk mencapai gelar tertinggi!`)
            .addFields({ name: 'Total XP', value: `${player.xp} XP`, inline: true });

        await context.reply({ embeds: [rankEmbed] });
    }
};