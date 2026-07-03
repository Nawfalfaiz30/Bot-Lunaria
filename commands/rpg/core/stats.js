const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const { calculateStats } = require('../../../helpers/statCalculator');

module.exports = {
  name: 'stats',
  aliases: ['stat', 'rpgstats', 'rpgs', 's'],
  description: 'Menampilkan rincian atribut pertempuran dan multiplier pasif karaktermu.',
  category: 'rpg/core',

  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Menampilkan rincian atribut pertempuran dan multiplier pasif karaktermu.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // Cek registrasi akun
    const userRPG = await RPG.findOne({ userId });

    if (!userRPG) {
      const noAccountEmbed = new EmbedBuilder()
        .setColor('#FF3333')
        .setTitle('❌ Akun Tidak Ditemukan')
        .setDescription(`Kamu belum terdaftar di semesta Lunaria. Silakan ketik perintah \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu untuk membuat karakter barumu!`);
      
      return context.reply({ embeds: [noAccountEmbed], ephemeral: true });
    }

    // Panggil jantung mesin kalkulator stat untuk menarik data riil terkalibrasi 10% TT
    const finalStats = calculateStats(userRPG);
    const { attributes, combatStats, multipliers } = finalStats;

    // 📊 CONVERSION ENGINE: Mengubah nilai Multiplier (1.x) menjadi format Persentase (x00%)
    const xpPercent = (multipliers.xp * 100).toFixed(1);
    const goldPercent = (multipliers.gold * 100).toFixed(0);
    const lootPercent = (multipliers.loot * 100).toFixed(0);

    const statsEmbed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setAuthor({ name: `Atribut Tempur: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`📊 Rincian Statistik Karakter (${userRPG.class || 'Novice'})`)
      .setTimestamp()
      .addFields(
        {
          name: '🧬 Atribut Dasar Terhitung (Live Attributes)',
          value: `◽ **STR (Strength):** \`${attributes.str.toFixed(1)}\` *(Meningkatkan ATK)*\n` +
                 `◽ **AGI (Agility):** \`${attributes.agi.toFixed(1)}\` *(Meningkatkan Crit/Evasion)*\n` +
                 `◽ **INT (Intelligence):** \`${attributes.int.toFixed(1)}\` *(Meningkatkan Mana/Magic)*\n` +
                 `◽ **VIT (Vitality):** \`${attributes.vit.toFixed(1)}\` *(Meningkatkan HP/DEF)*`,
          inline: false
        },
        {
          name: '⚔️ Stat Pertempuran Final (Combat Stats)',
          value: `❤️ **Max HP:** \`${combatStats.maxHp}\` Poin\n` +
                 `💧 **Max Mana:** \`${combatStats.maxMana}\` Poin\n` +
                 `💥 **Physical ATK:** \`${combatStats.atk}\` Poin\n` +
                 `🛡️ **Physical DEF:** \`${combatStats.def}\` Poin\n` +
                 `⚡ **Critical Rate:** \`${combatStats.critRate}%\` \n` +
                 `💨 **Evasion Rate:** \`${combatStats.evasionRate}%\``,
          inline: false
        },
        {
          name: '✨ Pengali Hadiah Aktif (Prestige Multipliers)',
          value: `📈 **Bonus XP:** \`${xpPercent}%\` \n` +
                 `💰 **Bonus Emas:** \`${goldPercent}%\` \n` +
                 `📦 **Bonus Item Drop:** \`${lootPercent}%\` \n\n`,
          inline: false
        }
      );

    return context.reply({ 
      embeds: [statsEmbed], 
      ephemeral: false 
    });
  }
};