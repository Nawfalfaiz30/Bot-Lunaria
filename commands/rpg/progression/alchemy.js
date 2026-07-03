const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const recipesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/recipes.json'), 'utf8'));

module.exports = {
  name: 'alchemy',
  aliases: ['alkimia', 'craftpotion'],
  description: 'Meracik ramuan magis berdurasi yang langsung diserap tubuh untuk mengaktifkan buff instan.',
  category: 'rpg/crafting',

  data: new SlashCommandBuilder()
    .setName('alchemy')
    .setDescription('Meracik ramuan magis untuk langsung mengaktifkan buff berdurasi.')
    .addStringOption(opt => opt.setName('item').setDescription('Nama lengkap ramuan yang ingin diracik').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Jumlah ramuan yang ingin diracik').setRequired(false)),

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
      if (!args || args.length === 0) return context.reply({ content: '❌ Tentukan ramuan yang ingin diracik! Contoh: `alchemy Berserker Potion 2`', ephemeral: true });
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
      return context.reply({ content: `❌ Ramuan bernama **"${inputStr}"** tidak ditemukan di dalam bursa penamaan Lunaria!`, ephemeral: true });
    }

    // 2. Validasi Ketersediaan di Kategori Kitab Alkimia
    const recipe = recipesData.alchemy[itemId];
    if (!recipe) {
      return context.reply({ content: `❌ **${itemInfo.name}** bukan merupakan zat katalis cairan magis yang bisa diolah di Laboratorium Alkimia!`, ephemeral: true });
    }

    // 3. Muat Data Karakter & Tas Inventaris Pemain
    const userRPG = await RPG.findOne({ userId });
    const userInv = await Inventory.findOne({ userId });
    if (!userRPG || !userInv) return context.reply({ content: '❌ Karaktermu belum terdaftar!', ephemeral: true });

    // 4. VALIDASI KECUKUPAN BAHAN REAKSI KIMIA
    for (const ingId in recipe.ingredients) {
      const requiredQty = recipe.ingredients[ingId] * amount;
      const playerHas = userInv.items.find(i => i.itemId === ingId);
      
      if (!playerHas || playerHas.amount < requiredQty) {
        const ingName = itemsData[ingId]?.name || ingId;
        return context.reply({ 
          content: `❌ Zat bahan kimia tidak cukup! Kamu memerlukan **${requiredQty}x ${ingName}**, sedangkan di tasmu hanya ada \`${playerHas ? playerHas.amount : 0}\`x.`, 
          ephemeral: true 
        });
      }
    }

    // 5. EKSEKUSI POTONG BAHAN REAKSI DARI TAS INVENTARIS
    for (const ingId in recipe.ingredients) {
      const requiredQty = recipe.ingredients[ingId] * amount;
      const invIdx = userInv.items.findIndex(i => i.itemId === ingId);
      userInv.items[invIdx].amount -= requiredQty;
      if (userInv.items[invIdx].amount === 0) userInv.items.splice(invIdx, 1);
    }

    // =================================================================
    // 🧪 INSTANT USE MECHANICAL: REAKSI KIMIA LANGSUNG MASUK KE ARRAY BUFF
    // =================================================================
    let buffLogString = "";
    if (itemInfo.buff) {
      const durationMs = (itemInfo.buff.duration || 60000) * amount; // Akumulasi waktu jika membuat banyak sekaligus
      const now = Date.now();

      if (!userRPG.buffs) userRPG.buffs = [];

      // Periksa apakah efek ramuan ini sudah aktif sebelumnya di dalam tubuh
      const existingBuffIndex = userRPG.buffs.findIndex(b => b.itemName === itemInfo.name);

      if (existingBuffIndex !== -1) {
        // Jika ramuan sejenis sedang aktif, lakukan sistem Time Stacking (Perpanjang Lini Masa)
        const oldExpire = userRPG.buffs[existingBuffIndex].expiresAt.getTime();
        const baseAnchor = oldExpire > now ? oldExpire : now;
        userRPG.buffs[existingBuffIndex].expiresAt = new Date(baseAnchor + durationMs);
        
        const totalMinutes = Math.ceil((userRPG.buffs[existingBuffIndex].expiresAt.getTime() - now) / 60000);
        buffLogString = `Durasi status efek **${itemInfo.name}** berhasil bertumpuk lebih lama menjadi **${totalMinutes} menit** sisa di tubuhmu.`;
      } else {
        // Jika buff baru pertama kali masuk, dorong sub-dokumen baru ke database
        userRPG.buffs.push({
          itemName: itemInfo.name,
          statTarget: itemInfo.buff.statTarget,
          value: itemInfo.buff.value,
          type: itemInfo.buff.type,
          expiresAt: new Date(now + durationMs)
        });
        
        const formatVal = itemInfo.buff.type === 'percent' ? `${Math.round(itemInfo.buff.value * 100)}%` : `+${itemInfo.buff.value}`;
        buffLogString = `Memperoleh tambahan bonus live-stat \`${formatVal}\` **${itemInfo.buff.statTarget.toUpperCase()}** selama **${Math.ceil(durationMs / 60000)} menit** ke depan.`;
      }
    } else {
      buffLogString = "Uap ramuan berhasil terserap ke dalam batin, memberikan ketenangan sirkulasi mana.";
    }

    // Simpan seluruh modifikasi perubahan ke MongoDB secara kolektif
    await userRPG.save();
    await userInv.save();

    const alchemyEmbed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('🧪 Eksperimen Alkimia & Penyerapan Sukses')
      .setDescription(
        `Kamu mereaksikan tabung zat katalis, menyuling esensinya, dan **langsung meminum habis** ramuan **${amount}x** ${itemInfo.emoji} **${itemInfo.name}**!\n\n` +
        `✨ **Efek Status Aktif:** ${buffLogString}\n\n` +
        `💡 *Gunakan perintah \`profile\` untuk meninjau hitung mundur sisa durasi ramuan obatmu secara real-time.*`
      )
      .setTimestamp();

    return context.reply({ embeds: [alchemyEmbed] });
  }
};
