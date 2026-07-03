const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { getXPNeededForLevel } = require('../../../helpers/rpgSystem');

module.exports = {
  name: 'daily',
  aliases: ['harian', 'klaimharian'],
  description: 'Mengklaim jatah kotak hadiah bantuan harian dari Kerajaan Lunaria.',
  category: 'rpg/economy',

  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Mengklaim jatah kotak hadiah bantuan harian dari Kerajaan Lunaria.'),

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
    const COOLDOWN_TIME = 24 * 60 * 60 * 1000; // Sesi 24 Jam murni

    if (userCooldown.daily && now < userCooldown.daily.getTime()) {
      const timeLeft = userCooldown.daily.getTime() - now;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return context.reply({ 
        content: `⏳ **Kotak Bantuan Kosong!** Kamu sudah mengklaimnya hari ini. Datang kembali dalam \`${hours} Jam ${minutes} Menit ${seconds} Detik\`!`, 
        ephemeral: true 
      });
    }

    // 2. Kalkulasi Hadiah Dinamis Berbasis Level & Live Multiplier Player
    const liveStats = calculateStats(userRPG);
    const playerLevel = userRPG.level || 1;

    // Nilai dasar (Base Reward) yang meningkat mengikuti level pemain
    const baseGold = 1000 * playerLevel;
    const baseXP = 150 * playerLevel;

    // Mengalikan dengan multiplier pasif/TT hasil kalkulator terpusat
    const finalGold = Math.round(baseGold * liveStats.multipliers.gold);
    const finalXP = Math.round(baseXP * liveStats.multipliers.xp);

    // 3. Eksekusi Suntikan Hadiah Ke Database Karakter
    userRPG.gold += finalGold;
    userRPG.xp += finalXP;

    // Background Engine: Loop check penanganan otomatis kenaikan level
    let levelUpCount = 0;
    while (userRPG.xp >= getXPNeededForLevel(userRPG.level)) {
      userRPG.xp -= getXPNeededForLevel(userRPG.level);
      userRPG.level += 1;
      levelUpCount++;
    }

    // Simpan waktu perizinan klaim berikutnya (Besok)
    userCooldown.daily = new Date(now + COOLDOWN_TIME);

    await userRPG.save();
    await userCooldown.save();

    // 4. Render Panel Hadiah Embed
    const dailyEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('☀️ Kotak Bantuan Harian Kerajaan')
      .setDescription(
        `Kamu membuka kiriman logistik harian dari istana dewi malam Lunaria!\n` +
        `────────────────────────────────────────\n` +
        `• **Hadiah Koin:** 💰 \`+${finalGold.toLocaleString('id-ID')}\` Gold *(Skala Multiplier)*\n` +
        `• **Hadiah Jiwa:** 📈 \`+${finalXP.toLocaleString('id-ID')}\` XP\n` +
        `────────────────────────────────────────`
      )
      .setTimestamp();

    if (levelUpCount > 0) {
      dailyEmbed.addFields({ 
        name: '🎉 TINGKATAN MENINGKAT!', 
        value: `Sihir hadiah harian meluap! Karaktermu berhasil naik sebanyak **${levelUpCount} Level**! Sekarang kamu berada di **Level ${userRPG.level}**.` 
      });
    }

    return context.reply({ embeds: [dailyEmbed] });
  }
};