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
  name: 'mine',
  aliases: ['tambang', 'm'],
  description: 'Menambang bebatuan di area saat ini untuk mengumpulkan bijih mineral logam.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Menambang bebatuan di area saat ini untuk mengumpulkan bijih mineral logam.'),

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
    const cooldownDuration = 15000; 
    const elapsed = Date.now() - cooldownDoc.mine.getTime();

    if (elapsed < cooldownDuration) {
      const timeLeft = Math.ceil((cooldownDuration - elapsed) / 1000);
      return context.reply({ 
        content: `⏳ Otot lenganmu masih tegang! Tunggu **${timeLeft} detik** lagi sebelum menghantam batu kembali.`, 
        ephemeral: true 
      });
    }

    // 3. VALIDASI: Kewajiban Memakai Alat Kerja (Pickaxe)
    if (!userRPG.equipment.pickaxe) {
      return context.reply({ 
        content: `❌ Kamu tidak bisa menghancurkan batu dengan tangan kosong! Beli beliung di \`shop\` lalu pasang dengan perintah \`equip [id_pickaxe]\`.`, 
        ephemeral: true 
      });
    }

    // 4. EKSEKUSI PENGHITUNGAN MESIN GATHERING (RNG & PASSIVE CORE)
    const liveStats = calculateStats(userRPG);
    const currentAreaNumber = userRPG.current_area;
    const currentAreaInfo = areaData[`area_${currentAreaNumber}`];

    const harvest = determineGatheringLoot('mine', currentAreaNumber, liveStats);
    if (!harvest) {
      return context.reply({ content: '❌ Terjadi kegagalan memuat data sumber daya tambang area.', ephemeral: true });
    }

    const harvestedItemInfo = itemsData[harvest.itemId];

    // 5. PEMBUKUAN DATABASE MONGODB
    // Simpan item hasil tambang ke dalam tas inventaris stacking
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
    cooldownDoc.mine = new Date();
    await cooldownDoc.save();

    // ==========================================
    // PENYUSUNAN EMBED NOTIFIKASI VISUAL HADIAH
    // ==========================================
    const toolInfo = itemsData[userRPG.equipment.pickaxe];
    
    let luckyStatusString = '';
    if (harvest.isRare) luckyStatusString = ' ✨ **[MENEMUKAN PERMATA LANGKA!]**';
    if (harvest.isDouble) luckyStatusString = ' ⚡ **[CRITICAL MINING X2!]**';

    const mineEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setAuthor({ name: `${user.username} sedang menambang batu...`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`⛏️ Aktivitas Penambangan Mineral`)
      .setDescription(
        `Menggunakan ${toolInfo.emoji} **${toolInfo.name}** di wilayah **${currentAreaInfo.emoji} ${currentAreaInfo.name}**:\n\n` +
        `📦 **Barang Didapat:** +**${harvest.amount}x** ${harvestedItemInfo.emoji} **${harvestedItemInfo.name}**${luckyStatusString}\n` +
        `💰 **Bonus Komersial:** +\`${finalGold.toLocaleString('id-ID')}\` Gold\n` +
        `📈 **Energi Didapat:** +` + '`' + harvest.xp + '`' + ` XP`
      )
      .setFooter({ text: `Lunaria Gathering Engine • Area ${currentAreaNumber}` })
      .setTimestamp();

    if (xpResult.leveledUp) {
      mineEmbed.addFields({ 
        name: '🎉 LEVEL UP!', 
        value: `Selamat! Tubuhmu semakin bugar setelah menambang! Naik menjadi **Level ${xpResult.newLevel}**.` 
      });
    }

    return context.reply({ embeds: [mineEmbed] });
  }
};  