const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

// Memuat data perlengkapan statis
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));

module.exports = {
  name: 'equip',
  aliases: ['usegear', 'pasang'],
  description: 'Memasang senjata atau alat kerja dari tas ke tubuh karaktermu menggunakan nama barang.',
  category: 'rpg/progression',

  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Memasang senjata atau alat kerja dari tas ke tubuh karaktermu.')
    .addStringOption(opt => opt.setName('item').setDescription('Nama lengkap perlengkapan yang ingin dipasang (Contoh: Knight Grand Greatsword)').setRequired(true)),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    let inputStr = "";

    // =================================================================
    // 🧠 SMART ARGUMENT PARSER (MENDUKUNG MULTI-WORD NAMA BERSPASI)
    // =================================================================
    if (isPrefix) {
      if (!args || args.length === 0) {
        return context.reply({ content: '❌ Tentukan nama barang yang mau dipasang! Contoh: `equip Knight Grand Greatsword`', ephemeral: true });
      }
      inputStr = args.join(' ').trim().toLowerCase();
    } else {
      inputStr = context.options.getString('item').trim().toLowerCase();
    }

    if (!inputStr) {
      return context.reply({ content: '❌ Mohon masukkan nama perlengkapan yang valid!', ephemeral: true });
    }

    // =================================================================
    // 🔍 REVERSE LOOKUP ENGINE: CARI ID BERDASARKAN PROPERTI 'NAME'
    // =================================================================
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
        content: `❌ Perlengkapan dengan nama **"${isPrefix ? args.join(' ') : context.options.getString('item')}"** tidak ditemukan di dalam tas atau kamus semesta Lunaria!`, 
        ephemeral: true 
      });
    }

    // 1. Validasi Akun Terdaftar
    const userRPG = await RPG.findOne({ userId });
    const userInv = await Inventory.findOne({ userId });
    if (!userRPG || !userInv) {
      return context.reply({ content: `❌ Kamu belum terdaftar! Ketik \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu.`, ephemeral: true });
    }

    // 2. Validasi Tipe Barang di Kamus Data
    if (itemInfo.type !== 'equipment') {
      return context.reply({ content: `❌ Barang **${itemInfo.name}** bukan merupakan jenis perlengkapan (Equipment) yang bisa dipasang ke tubuh!`, ephemeral: true });
    }

    // 3. Validasi Kepemilikan Barang di Inventaris Pemain
    const invIndex = userInv.items.findIndex(i => i.itemId === itemId);
    if (invIndex === -1 || userInv.items[invIndex].amount <= 0) {
      return context.reply({ content: `❌ Kamu tidak memiliki ${itemInfo.emoji} **${itemInfo.name}** di dalam tas inventarismu!`, ephemeral: true });
    }

    const slot = itemInfo.slot; // Otomatis mendeteksi slot target: weapon, armor, fishing_rod, pickaxe, axe
    const oldItemId = userRPG.equipment[slot];

    // 4. EKSEKUSI LOGIKA TUKAR PAKAI (SWAP GEAR MECHANICAL)
    // Konsumsi 1 item perlengkapan baru dari tas pemain
    userInv.items[invIndex].amount -= 1;
    if (userInv.items[invIndex].amount === 0) {
      userInv.items.splice(invIndex, 1);
    }

    // Jika slot target sudah berisi gear lama, preteli dan kembalikan gear lama ke tas
    if (oldItemId) {
      const oldItemIndex = userInv.items.findIndex(i => i.itemId === oldItemId);
      if (oldItemIndex !== -1) {
        userInv.items[oldItemIndex].amount += 1;
      } else {
        userInv.items.push({ itemId: oldItemId, amount: 1 });
      }
    }

    // Pasang ID barang baru ke dalam slot dokumen database user
    userRPG.equipment[slot] = itemId;

    // Simpan perubahan massal secara serentak ke MongoDB
    await userRPG.save();
    await userInv.save();

    // ==========================================
    // PENYUSUNAN EMBED NOTIFIKASI SUKSES PASANG
    // ==========================================
    const oldItemInfo = oldItemId ? itemsData[oldItemId] : null;
    const swapString = oldItemInfo 
      ? `Menggantikan perlengkapan lama: ${oldItemInfo.emoji} ~~${oldItemInfo.name}~~ (Dikembalikan ke dalam tas).`
      : 'Slot perlengkapan ini sebelumnya kosong.';

    const equipEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('🛡️ Perlengkapan Berhasil Dipasang')
      .setDescription(
        `Kamu sekarang aktif menggunakan ${itemInfo.emoji} **${itemInfo.name}** pada slot **[${slot.toUpperCase()}]**.\n\n` +
        `ℹ️ *${swapString}*\n` +
        `💡 *Statistik pertempuran/aktivitasmu otomatis diperbarui secara dinamis.*`
      )
      .setTimestamp();

    return context.reply({ embeds: [equipEmbed] });
  }
};