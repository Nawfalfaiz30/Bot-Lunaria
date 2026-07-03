const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const shopData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/shop.json'), 'utf8'));

module.exports = {
  name: 'sell',
  aliases: ['jual'],
  description: 'Menjual barang dari dalam tas dengan sistem proteksi keamanan armor terpasang.',
  category: 'rpg/economy',

  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Menjual barang dari dalam tas dengan sistem proteksi keamanan armor terpasang.')
    .addStringOption(opt => opt.setName('item').setDescription('Nama lengkap item yang ingin dijual (Contoh: Carp)').setRequired(true))
    .addStringOption(opt => opt.setName('amount').setDescription('Jumlah barang (bisa ketik angka murni, "4k", atau "all")').setRequired(false)),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    let inputStr = "";
    let amountStr = "1";

    if (isPrefix) {
      if (!args || args.length === 0) {
        return context.reply({ content: '❌ Mohon masukkan nama item yang ingin dijual! Contoh: `sell Carp 4k` atau `sell Carp all`', ephemeral: true });
      }
      const lastArg = args[args.length - 1].toLowerCase();
      if (/^(all|\d+(?:\.\d+)?[kmb]?)$/.test(lastArg)) {
        amountStr = lastArg;
        args.pop();
      }
      inputStr = args.join(' ').trim().toLowerCase();
    } else {
      inputStr = context.options.getString('item').trim().toLowerCase();
      amountStr = context.options.getString('amount')?.trim().toLowerCase() || "1";
    }

    if (!inputStr) {
      return context.reply({ content: '❌ Mohon masukkan nama item yang valid!', ephemeral: true });
    }

    let itemId = null;
    let itemInfo = null;

    for (const [key, value] of Object.entries(itemsData)) {
      if (value.name && value.name.trim().toLowerCase() === inputStr) {
        itemId = key;
        itemInfo = value;
        break;
      }
    }

    if (!itemId || !itemInfo) {
      return context.reply({ content: `❌ Nama item **"${isPrefix ? args.join(' ') : context.options.getString('item')}"** tidak dikenali!`, ephemeral: true });
    }

    const userInv = await Inventory.findOne({ userId });
    const userRPG = await RPG.findOne({ userId });
    
    if (!userRPG || !userInv) return context.reply({ content: '❌ Akun terdaftar tidak ditemukan.', ephemeral: true });

    // 🌟 SELEKSI UTAMA 1: PROTEKSI SAFETY LOCK ANTI-ACCIDENTAL SELL
    const isCurrentlyEquipped = Object.values(userRPG.equipment || {}).includes(itemId);
    if (isCurrentlyEquipped) {
      return context.reply({ 
        content: `❌ Gagal melikuidasi! **${itemInfo.name}** masih menempel aktif di tubuhmu! Lepas terlebih dahulu (*unequip*) jika ingin melelangnya ke pasar gelap.`, 
        ephemeral: true 
      });
    }

    const inventoryIndex = userInv.items.findIndex(i => i.itemId === itemId);
    if (inventoryIndex === -1 || userInv.items[inventoryIndex].amount <= 0) {
      return context.reply({ content: `❌ Kamu tidak memiliki item **${itemInfo.name}** di dalam tasmu untuk dijual!`, ephemeral: true });
    }

    const ownedAmount = userInv.items[inventoryIndex].amount;
    let amount = 1;

    if (amountStr === 'all') {
      amount = ownedAmount;
    } else {
      const match = amountStr.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
      if (match) {
        let num = parseFloat(match[1]);
        const unit = match[2];
        if (unit === 'k') num *= 1000;
        else if (unit === 'm') num *= 1000000;
        else if (unit === 'b') num *= 1000000000;
        amount = Math.floor(num);
      } else {
        amount = 1;
      }
    }

    if (amount <= 0) {
      return context.reply({ content: '❌ Jumlah item yang ingin dijual harus lebih dari 0!', ephemeral: true });
    }

    if (ownedAmount < amount) {
      return context.reply({ content: `❌ Kuantitas barang tidak mencukupi untuk dijual sebanyak \`${amount.toLocaleString('id-ID')}\`x!`, ephemeral: true });
    }

    const shopProduct = shopData[itemId];
    let singleSellPrice = shopProduct ? Math.round(shopProduct.buy_price * 0.80) : (itemInfo.sell_price || 10);

    const totalEarnings = singleSellPrice * amount;

    // Mutasi tas inventarisasi
    userInv.items[inventoryIndex].amount -= amount;
    
    // 🌟 SELEKSI UTAMA 2: MEMORI RESET JIKA BARANG BENAR-BENAR LENYAP DARI TAS (AMOUT = 0)
    if (userInv.items[inventoryIndex].amount === 0) {
      userInv.items.splice(inventoryIndex, 1);
      
      if (userRPG.refine && userRPG.refine[itemId]) {
        delete userRPG.refine[itemId]; // Pembersihan mutlak
        userRPG.markModified('refine');
      }
    }
    
    await userInv.save();

    userRPG.gold += totalEarnings;
    await userRPG.save();

    let totalGoldBigInt;
    try { totalGoldBigInt = BigInt(userRPG.gold); } catch (e) { totalGoldBigInt = 0n; }

    const ONE_TRILLION = 1000000000000n;
    const premiumCount = totalGoldBigInt / ONE_TRILLION;
    const displayGold = totalGoldBigInt % ONE_TRILLION;

    let premiumFormatStr = premiumCount >= 1000000000n ? Number(premiumCount).toExponential(2) : Number(premiumCount).toLocaleString('id-ID');

    let walletDisplay = `💰 \`${Number(displayGold).toLocaleString('id-ID')}\` Gold`;
    if (premiumCount > 0n) walletDisplay += ` | 🪙 \`${premiumFormatStr}\` T Aurum Gold`;

    const sellEmbed = new EmbedBuilder()
      .setColor('#F39C12')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('💰 Penjualan Sukses')
      .setDescription(
        `Kamu berhasil melikuidasi **${amount.toLocaleString('id-ID')}x** ${itemInfo.emoji} **${itemInfo.name}** ke tengkulak!\n\n` +
        `💸 **Pendapatan Koin:** \`+${totalEarnings.toLocaleString('id-ID')}\` Gold\n` +
        `💳 **Total Dompet Sekarang:** ${walletDisplay}`
      )
      .setTimestamp();

    return context.reply({ embeds: [sellEmbed] });
  }
};