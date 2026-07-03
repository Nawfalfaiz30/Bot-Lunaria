const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));

module.exports = {
  name: 'unequip',
  aliases: ['lepas', 'offgear'],
  description: 'Mencopot perlengkapan aktif dari tubuh dan memasukkannya kembali ke tas.',
  category: 'rpg/progression',

  data: new SlashCommandBuilder()
    .setName('unequip')
    .setDescription('Mencopot perlengkapan aktif dari tubuh dan memasukkannya kembali ke tas.')
    .addStringOption(opt => 
      opt.setName('slot')
        .setDescription('Pilih slot zirah/alat yang ingin dicopot')
        .setRequired(true)
        .addChoices(
          { name: '⚔️ Weapon (Senjata)', value: 'weapon' },
          { name: '🛡️ Armor (Zirah Pelindung)', value: 'armor' },
          { name: '🎣 Fishing Rod (Pancing)', value: 'fishing_rod' },
          { name: '⛏️ Pickaxe (Beliung)', value: 'pickaxe' },
          { name: '🪓 Axe (Kapak Penebang)', value: 'axe' }
        )
    ),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // Ekstraksi slot dari mode Hybrid
    let slotInput = isPrefix ? args[0] : context.options.getString('slot');
    if (!slotInput) {
      return context.reply({ content: '❌ Tentukan nama slot yang mau dicopot! Pilihan: `weapon`, `armor`, `fishing_rod`, `pickaxe`, `axe`', ephemeral: true });
    }
    const slot = slotInput.toLowerCase();

    // 🌟 PERBAIKAN: Memasukkan 'armor' ke dalam jajaran validasi agar bisa dilepas
    const validSlots = ['weapon', 'armor', 'fishing_rod', 'pickaxe', 'axe'];
    if (!validSlots.includes(slot)) {
      return context.reply({ content: '❌ Nama slot tidak valid! Pilih di antara: `weapon`, `armor`, `fishing_rod`, `pickaxe`, `axe`', ephemeral: true });
    }

    // 1. Ambil Data Dokumen DB
    const userRPG = await RPG.findOne({ userId });
    const userInv = await Inventory.findOne({ userId });
    if (!userRPG || !userInv) return context.reply({ content: '❌ Profil karakter tidak ditemukan.', ephemeral: true });

    // 2. Cek Apakah Slot Tersebut Memang Berisi Barang[cite: 17]
    const equippedItemId = userRPG.equipment[slot];
    if (!equippedItemId) {
      return context.reply({ content: `❌ Slot **[${slot.toUpperCase()}]** kamu memang sedang kosong! Tidak ada yang bisa dicopot.`, ephemeral: true });
    }

    const itemInfo = itemsData[equippedItemId];

    // 3. EKSEKUSI COPOT PERLENGKAPAN[cite: 17]
    // Kosongkan string slot di database[cite: 17]
    userRPG.equipment[slot] = null;

    // Kembalikan unit item ke array inventaris stacking[cite: 17]
    const invIndex = userInv.items.findIndex(i => i.itemId === equippedItemId);
    if (invIndex !== -1) {
      userInv.items[invIndex].amount += 1;
    } else {
      userInv.items.push({ itemId: equippedItemId, amount: 1 });
    }

    // Simpan pembukuan MongoDB[cite: 17]
    await userRPG.save();
    await userInv.save();

    const unequipEmbed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('📦 Perlengkapan Dicopot')
      .setDescription(
        `Kamu telah melepas ${itemInfo ? itemInfo.emoji : '📦'} **${itemInfo ? itemInfo.name : equippedItemId}** dari slot **[${slot.toUpperCase()}]**.\n\n` +
        `📥 Barang tersebut kini aman disimpan kembali di dalam \`/inventory\` milikmu.`
      )
      .setTimestamp();

    return context.reply({ embeds: [unequipEmbed] });
  }
};