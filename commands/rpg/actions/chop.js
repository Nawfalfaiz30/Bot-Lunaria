const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { determineGatheringLoot } = require('../../../helpers/rngHelper');
const { processXPGain } = require('../../../helpers/rpgSystem');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/area.json'), 'utf8'));

module.exports = {
  name: 'chop',
  aliases: ['tebang', 'c'],
  description: 'Menebang pohon di area saat ini untuk mengumpulkan kayu material.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('chop')
    .setDescription('Menebang pohon di area saat ini untuk mengumpulkan kayu material.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI: Cek pendaftaran karakter
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      return context.reply({ 
        content: `❌ Kamu belum terdaftar! Ketik \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu.`, 
        ephemeral: true 
      });
    }

    // 2. VALIDASI: Sistem Anti-Spam Cooldown (Durasi: 15 Detik)
    const cooldownDoc = await Cooldown.findOne({ userId });
    const cooldownDuration = 15000; // 15 detik dalam milidetik
    const elapsed = Date.now() - cooldownDoc.chop.getTime();

    if (elapsed < cooldownDuration) {
      const timeLeft = Math.ceil((cooldownDuration - elapsed) / 1000);
      return context.reply({ 
        content: `⏳ Lenganmu masih lelah! Tunggu **${timeLeft} detik** lagi sebelum menebang pohon kembali.`, 
        ephemeral: true 
      });
    }

    // 3. VALIDASI: Kewajiban Memakai Alat Kerja (Axe)
    if (!userRPG.equipment.axe) {
      return context.reply({ 
        content: `❌ Kamu tidak bisa menebang pohon dengan tangan kosong! Beli kapak di \`shop\` lalu pasang dengan perintah \`equip [id_kapak]\`.`, 
        ephemeral: true 
      });
    }

    // 4. EKSEKUSI PENGHITUNGAN MESIN GATHERING (RNG & PASSIVE CORE)
    const liveStats = calculateStats(userRPG);
    const currentAreaNumber = userRPG.current_area;
    const currentAreaInfo = areaData[`area_${currentAreaNumber}`];

    const harvest = determineGatheringLoot('chop', currentAreaNumber, liveStats);
    if (!harvest) {
      return context.reply({ content: '❌ Terjadi kegagalan memuat data sumber daya area.', ephemeral: true });
    }

    const harvestedItemInfo = itemsData[harvest.itemId];

    // 5. PEMBUKUAN DATABASE MONGODB
    // Simpan item hasil tebangan ke dalam tas inventaris stacking
    const userInv = await Inventory.findOne({ userId });
    const inventoryItem = userInv.items.find(i => i.itemId === harvest.itemId);
    if (inventoryItem) {
      inventoryItem.amount += harvest.amount;
    } else {
      userInv.items.push({ itemId: harvest.itemId, amount: harvest.amount });
    }
    await userInv.save();

    // Tambahkan hadiah Koin Emas & Proses Kenaikan Level (XP Engine)
    const finalGold = Math.round(harvest.gold * liveStats.multipliers.gold);
    userRPG.gold += finalGold;
    const xpResult = processXPGain(userRPG, harvest.xp);
    await userRPG.save();

    // Kunci stempel waktu cooldown saat ini
    cooldownDoc.chop = new Date();
    await cooldownDoc.save();

    // ==========================================
    // PENYUSUNAN EMBED NOTIFIKASI VISUAL HADIAH
    // ==========================================
    const toolInfo = itemsData[userRPG.equipment.axe];
    
    let luckyStatusString = '';
    if (harvest.isRare) luckyStatusString = ' ✨ **[DAPAT PATAHAN LANGKA!]**';
    if (harvest.isDouble) luckyStatusString = ' ⚡ **[BERKAH GANDA!]**';

    const chopEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setAuthor({ name: `${user.username} sedang menebang pohon...`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`🪓 Aktivitas Penebangan Woodwork`)
      .setDescription(
        `Menggunakan ${toolInfo.emoji} **${toolInfo.name}** di wilayah **${currentAreaInfo.emoji} ${currentAreaInfo.name}**:\n\n` +
        `📦 **Barang Didapat:** +**${harvest.amount}x** ${harvestedItemInfo.emoji} **${harvestedItemInfo.name}**${luckyStatusString}\n` +
        `💰 **Bonus Komersial:** +\`${finalGold.toLocaleString('id-ID')}\` Gold\n` +
        `📈 **Energi Didapat:** +` + '`' + harvest.xp + '`' + ` XP`
      )
      .setFooter({ text: `Lunaria Gathering Engine • Area ${currentAreaNumber}` })
      .setTimestamp();

    // Jika terjadi kenaikan level lewat mesin xpEngine, suntikkan notifikasi tambahan
    if (xpResult.leveledUp) {
      chopEmbed.addFields({ 
        name: '🎉 LEVEL UP!', 
        value: `Selamat! Jiwa petualangmu berkembang! Naik menjadi **Level ${xpResult.newLevel}**.` 
      });
    }

    return context.reply({ embeds: [chopEmbed] });
  }
};