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
  name: 'fish',
  aliases: ['pancing', 'mancing', 'f'],
  description: 'Memancing ikan di perairan area saat ini untuk mengumpulkan bahan konsumsi.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('fish')
    .setDescription('Memancing ikan di perairan area saat ini untuk mengumpulkan bahan konsumsi.'),

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

    // 2. VALIDASI: Sistem Anti-Spam Cooldown (Durasi: 30 Detik)
    let cooldownDoc = await Cooldown.findOne({ userId });
    if (!cooldownDoc) {
      cooldownDoc = await Cooldown.create({ userId });
    }

    const cooldownDuration = 30000; 
    const lastFish = cooldownDoc.fish ? cooldownDoc.fish.getTime() : 0;
    const elapsed = Date.now() - lastFish;

    if (elapsed < cooldownDuration) {
      const timeLeft = Math.ceil((cooldownDuration - elapsed) / 1000);
      return context.reply({ 
        content: `⏳ Joran pancingmu belum siap! Tunggu **${timeLeft} detik** lagi sebelum melempar umpan kembali.`, 
        ephemeral: true 
      });
    }

    // 3. VALIDASI: Kewajiban Memakai Alat Kerja (Fishing Rod)
    if (!userRPG.equipment.fishing_rod) {
      return context.reply({ 
        content: `❌ Kamu tidak bisa memancing tanpa joran! Beli alat pancing di \`shop\` lalu pasang dengan perintah \`equip [id_joran]\`.`, 
        ephemeral: true 
      });
    }

    // 4. EKSEKUSI PENGHITUNGAN MESIN GATHERING (RNG & PASSIVE INTEGRATION)
    const liveStats = calculateStats(userRPG);
    const currentAreaNumber = userRPG.current_area;
    const currentAreaInfo = areaData[`area_${currentAreaNumber}`];

    const harvest = determineGatheringLoot('fish', currentAreaNumber, liveStats);
    if (!harvest) {
      return context.reply({ content: '❌ Terjadi kegagalan memuat data ekosistem perairan area.', ephemeral: true });
    }

    const harvestedItemInfo = itemsData[harvest.itemId];

    // 5. PEMBUKUAN DATABASE MONGODB
    // Simpan ikan hasil tangkapan ke dalam tas inventaris stacking
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
    cooldownDoc.fish = new Date();
    await cooldownDoc.save();

    // ==========================================
    // PENYUSUNAN EMBED NOTIFIKASI VISUAL HADIAH
    // ==========================================
    const toolInfo = itemsData[userRPG.equipment.fishing_rod];
    
    let luckyStatusString = '';
    if (harvest.isRare) luckyStatusString = ' 🐠 **[MENANGKAP IKAN LANGKA TIER TINGGI!]**';
    if (harvest.isDouble) luckyStatusString = ' ⚡ **[BERKAH LAUT: TANGKAPAN GANDA X2!]**';

    const fishEmbed = new EmbedBuilder()
      .setColor('#1ABC9C')
      .setAuthor({ name: `${user.username} melempar kail pancing...`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`🎣 Aktivitas Memancing Angling`)
      .setDescription(
        `Menggunakan ${toolInfo.emoji} **${toolInfo.name}** di wilayah **${currentAreaInfo.emoji} ${currentAreaInfo.name}**:\n\n` +
        `📦 **Hasil Tangkapan:** +**${harvest.amount}x** ${harvestedItemInfo.emoji} **${harvestedItemInfo.name}**${luckyStatusString}\n` +
        `💰 **Bonus Penjualan:** +\`${finalGold.toLocaleString('id-ID')}\` Gold\n` +
        `📈 **Energi Didapat:** +\`${harvest.xp}\` XP`
      )
      .setFooter({ text: `Lunaria Gathering Engine • Area ${currentAreaNumber}` })
      .setTimestamp();

    // Jika naik level via xpEngine, suntikkan field notifikasi tambahan
    if (xpResult.leveledUp) {
      fishEmbed.addFields({ 
        name: '🎉 LEVEL UP!', 
        value: `Selamat! Pemahaman alammu meningkat! Sekarang kamu berada di **Level ${xpResult.newLevel}**.` 
      });
    }

    return context.reply({ embeds: [fishEmbed] });
  }
};