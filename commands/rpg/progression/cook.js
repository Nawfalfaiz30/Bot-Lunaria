const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const recipesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/recipes.json'), 'utf8'));

module.exports = {
  name: 'cook',
  aliases: ['masak'],
  description: 'Memasak makanan peningkat atribut fisik yang langsung dikonsumsi secara permanen instan.',
  category: 'rpg/crafting',

  data: new SlashCommandBuilder()
    .setName('cook')
    .setDescription('Memasak makanan peningkat atribut fisik permanen (langsung dikonsumsi).')
    .addStringOption(opt => opt.setName('item').setDescription('Nama lengkap makanan yang ingin dimasak').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Jumlah hidangan yang ingin dimasak').setRequired(false)),

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
      if (!args || args.length === 0) return context.reply({ content: '❌ Tentukan makanan yang ingin dimasak! Contoh: `cook Roasted Wild Meat 2`', ephemeral: true });
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

    // 1. REVERSE LOOKUP: Cari ID Item berdasarkan nama string input
    let itemId = null;
    let itemInfo = null;
    for (const [key, val] of Object.entries(itemsData)) {
      if (val.name && val.name.trim().toLowerCase() === inputStr) {
        itemId = key;
        itemInfo = val;
        break;
      }
    }

    if (!itemId || !itemInfo) {
      return context.reply({ content: `❌ Hidangan bernama **"${inputStr}"** tidak terdaftar di semesta Lunaria!`, ephemeral: true });
    }

    // 2. Validasi Ketersediaan di Kategori Resep Cooking
    const recipe = recipesData.cooking[itemId];
    if (!recipe) {
      return context.reply({ content: `❌ **${itemInfo.name}** bukan merupakan jenis hidangan kuliner yang diolah di Dapur Kerajaan!`, ephemeral: true });
    }

    // 3. Muat Data Kolom Karakter & Tas Inventaris
    const userRPG = await RPG.findOne({ userId });
    const userInv = await Inventory.findOne({ userId });
    if (!userRPG || !userInv) return context.reply({ content: '❌ Karaktermu belum terdaftar! Ketik perintah `profile` dahulu.', ephemeral: true });

    // 4. VALIDASI KECUKUPAN BAHAN BAKU
    for (const ingId in recipe.ingredients) {
      const requiredQty = recipe.ingredients[ingId] * amount;
      const playerHas = userInv.items.find(i => i.itemId === ingId);
      
      if (!playerHas || playerHas.amount < requiredQty) {
        const ingName = itemsData[ingId]?.name || ingId;
        return context.reply({ 
          content: `❌ Bahan dapur tidak mencukupi! Kamu memerlukan **${requiredQty}x ${ingName}**, sedangkan di dalam tasmu hanya ada \`${playerHas ? playerHas.amount : 0}\`x.`, 
          ephemeral: true 
        });
      }
    }

    // 5. EKSEKUSI POTONG BAHAN BAKU DARI TAS INVENTARIS
    for (const ingId in recipe.ingredients) {
      const requiredQty = recipe.ingredients[ingId] * amount;
      const invIdx = userInv.items.findIndex(i => i.itemId === ingId);
      userInv.items[invIdx].amount -= requiredQty;
      if (userInv.items[invIdx].amount === 0) userInv.items.splice(invIdx, 1);
    }

    // =================================================================
    // 🔥 INSTANT USE MECHANICAL: DUNSUNTIKKAN LANGSUNG KE PERMANENT BONUS DB
    // =================================================================
    if (!userRPG.permanent_bonus) {
      userRPG.permanent_bonus = { str: 0, agi: 0, int: 0, vit: 0 };
    }

    let statLogString = "";
    if (itemInfo.permanent_stat) {
      const target = itemInfo.permanent_stat.target;
      const valAdded = itemInfo.permanent_stat.value * amount;
      
      // Tambahkan nilai murni permanen ke database
      userRPG.permanent_bonus[target] += valAdded;
      statLogString = `📈 Atribut murni **${target.toUpperCase()}** kamu melonjak tajam **+${valAdded}** secara permanen!`;
    } else {
      // Jika makanan tier rendah tidak punya permanent_stat, pulihkan HP instan sebagai fallback
      userRPG.hp = Math.min(userRPG.hp + (40 * amount));
      statLogString = `❤️ Kondisi tubuhmu terasa lebih segar! Kesehatan HP kamu dipulihkan sebesar \`+${40 * amount}\` HP.`;
    }

    // Simpan perubahan serentak ke MongoDB
    await userRPG.save();
    await userInv.save();

    const cookEmbed = new EmbedBuilder()
      .setColor('#F39C12')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('🍳 Aktivitas Memasak & Konsumsi Sukses')
      .setDescription(
        `Kamu menyalakan kompor perkemahan, meracik bumbu, dan **langsung melahap habis** hidangan **${amount}x** ${itemInfo.emoji} **${itemInfo.name}**!\n\n` +
        `${statLogString}\n\n` +
        `💡 *Statistik barumu kini telah terintegrasi penuh secara permanen ke dalam sistem RAM live-kalkulator.*`
      )
      .setTimestamp();

    return context.reply({ embeds: [cookEmbed] });
  }
};