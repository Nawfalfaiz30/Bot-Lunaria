const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const shopData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/shop.json'), 'utf8'));

module.exports = {
  name: 'buy',
  aliases: ['beli'],
  description: 'Membeli barang dari toko menggunakan gold dengan konversi otomatis ke satuan Aurum.',
  category: 'rpg/economy',

  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Membeli barang dari toko menggunakan koin emas.')
    .addStringOption(opt => opt.setName('item').setDescription('Nama lengkap item yang ingin dibeli (Contoh: Small HP Potion)').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Jumlah pembelian').setRequired(false)),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    let inputStr = "";
    let amount = 1;

    // =================================================================
    // 🧠 SMART ARGUMENT PARSER (MENDUKUNG NAMA BERSPASI & DIGIT AKHIR)
    // =================================================================
    if (isPrefix) {
      if (!args || args.length === 0) {
        return context.reply({ content: '❌ Mohon masukkan nama item yang ingin dibeli! Contoh: `buy Small HP Potion 5`', ephemeral: true });
      }
      const lastArg = args[args.length - 1];
      if (/^\d+$/.test(lastArg)) {
        amount = parseInt(lastArg);
        if (amount <= 0) amount = 1;
        args.pop(); 
      }
      inputStr = args.join(' ').trim().toLowerCase();
    } else {
      inputStr = context.options.getString('item').trim().toLowerCase();
      const amtInput = context.options.getInteger('amount');
      amount = amtInput && amtInput > 0 ? amtInput : 1;
    }

    if (!inputStr) {
      return context.reply({ content: '❌ Mohon masukkan nama item yang valid!', ephemeral: true });
    }

    // 1. REVERSE LOOKUP ENGINE: Cari ID Unik Berdasarkan Properti 'name'
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
      return context.reply({ 
        content: `❌ Item dengan nama **"${isPrefix ? args.join(' ') : context.options.getString('item')}"** tidak ditemukan di semesta Lunaria!`, 
        ephemeral: true 
      });
    }

    // 2. Validasi Keberadaan Barang di Toko
    const product = shopData[itemId];
    if (!product) {
      return context.reply({ content: `❌ Barang **${itemInfo.emoji} ${itemInfo.name}** tidak disediakan untuk dijual di toko resmi Lunaria!`, ephemeral: true });
    }

    // 3. Ambil Akun DB
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) return context.reply({ content: '❌ Kamu belum terdaftar! Silakan ketik perintah `profile` terlebih dahulu.', ephemeral: true });

    // 4. Validasi Kecukupan Uang Emas
    const totalCost = product.buy_price * amount;
    if (userRPG.gold < totalCost) {
      return context.reply({ 
        content: `💰 Gold kamu tidak cukup! Total harga: \`${totalCost.toLocaleString('id-ID')}\` Emas, sedangkan koinmu hanya \`${userRPG.gold.toLocaleString('id-ID')}\` Emas.`, 
        ephemeral: true 
      });
    }

    // 5. EKSEKUSI PEMBUKUAN DATABASE
    userRPG.gold -= totalCost;
    await userRPG.save();

    const userInv = await Inventory.findOne({ userId });
    const existingItem = userInv.items.find(i => i.itemId === itemId);

    if (existingItem) {
      existingItem.amount += amount;
    } else {
      userInv.items.push({ itemId: itemId, amount: amount });
    }
    await userInv.save();

    // =================================================================
    // 🪙 INTERACTIVE AURUM CONVERSION ENGINE (SINKRON DENGAN SELL.JS)
    // =================================================================
    let totalGoldBigInt;
    try { totalGoldBigInt = BigInt(userRPG.gold); } catch (e) { totalGoldBigInt = 0n; }

    const ONE_TRILLION = 1000000000000n;
    const premiumCount = totalGoldBigInt / ONE_TRILLION;
    const displayGold = totalGoldBigInt % ONE_TRILLION;

    let premiumFormatStr = premiumCount >= 1000000000n ? Number(premiumCount).toExponential(2) : Number(premiumCount).toLocaleString('id-ID');

    let walletDisplay = `\`${Number(displayGold).toLocaleString('id-ID')}\` Gold`;
    if (premiumCount > 0n) walletDisplay += ` | 🪙 \`${premiumFormatStr}\` T Aurum Gold`;

    const successEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('🛍️ Transaksi Toko Sukses')
      .setDescription(
        `Kamu berhasil membeli **${amount}x** ${itemInfo.emoji} **${itemInfo.name}**!\n\n` +
        `💰 **Total Pengeluaran:** \`${totalCost.toLocaleString('id-ID')}\` Gold\n` +
        `📉 **Sisa Dompet Sekarang:** 💰 ${walletDisplay}`
      )
      .setTimestamp();

    return context.reply({ embeds: [successEmbed] });
  }
};