const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { getXPNeededForLevel } = require('../../../helpers/rpgSystem');

module.exports = {
  name: 'weekly',
  aliases: ['mingguan', 'klaimmingguan'],
  description: 'Membuka peti pasokan logistik mingguan skala masif milik serikat petualang.',
  category: 'rpg/economy',

  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Membuka peti pasokan logistik mingguan skala masif milik serikat petualang.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. Validasi Akun RPG & Cooldown
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      return context.reply({ content: `❌ Kamu belum terdaftar! Ketik \`profile\` untuk membuat karakter terlebih dahulu.`, ephemeral: true });
    }

    let userCooldown = await Cooldown.findOne({ userId });
    if (!userCooldown) {
      userCooldown = new Cooldown({ userId });
    }

    const now = Date.now();
    const COOLDOWN_TIME = 7 * 24 * 60 * 60 * 1000; // Sesi 7 Hari murni

    if (userCooldown.weekly && now < userCooldown.weekly.getTime()) {
      const timeLeft = userCooldown.weekly.getTime() - now;
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return context.reply({ 
        content: `⏳ **Peti Terkunci Segel Agung!** Sesi mingguan belum di-reset. Kembali lagi dalam \`${days} Hari ${hours} Jam ${minutes} Menit\`!`, 
        ephemeral: true 
      });
    }

    // 2. Kalkulasi Hadiah Skala Besar (Lebih masif dibanding harian)
    const liveStats = calculateStats(userRPG);
    const playerLevel = userRPG.level || 1;

    // Bobot multiplier dasar diatur 6x lipat lebih besar dibanding jatah harian
    const baseGold = 6500 * playerLevel;
    const baseXP = 1000 * playerLevel;

    const finalGold = Math.round(baseGold * liveStats.multipliers.gold);
    const finalXP = Math.round(baseXP * liveStats.multipliers.xp);

    // 3. Aplikasikan Hasil Hadiah Ke Karakter
    userRPG.gold += finalGold;
    userRPG.xp += finalXP;

    let levelUpCount = 0;
    while (userRPG.xp >= getXPNeededForLevel(userRPG.level)) {
      userRPG.xp -= getXPNeededForLevel(userRPG.level);
      userRPG.level += 1;
      levelUpCount++;
    }

    // Mengunci tanggal klaim untuk satu minggu ke depan
    userCooldown.weekly = new Date(now + COOLDOWN_TIME);

    await userRPG.save();
    await userCooldown.save();

    // 4. Render Panel Hadiah Embed
    const weeklyEmbed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('💎 Peti Pasokan Akbar Mingguan')
      .setDescription(
        `Kamu berhasil membongkar brankas bantuan mingguan dari Guild Master Lunaria!\n` +
        `────────────────────────────────────────\n` +
        `• **Hadiah Koin:** 💰 \`+${finalGold.toLocaleString('id-ID')}\` Gold *(Skala Multiplier)*\n` +
        `• **Hadiah Jiwa:** 📈 \`+${finalXP.toLocaleString('id-ID')}\` XP\n` +
        `────────────────────────────────────────`
      )
      .setTimestamp();

    if (levelUpCount > 0) {
      weeklyEmbed.addFields({ 
        name: '🎉 TINGKATAN MENINGKAT MALAM INI!', 
        value: `Ledakan berkah mingguan! Karaktermu berhasil melonjak naik sebanyak **${levelUpCount} Level** sekaligus! Level saat ini: **Level ${userRPG.level}**.` 
      });
    }

    return context.reply({ embeds: [weeklyEmbed] });
  }
};