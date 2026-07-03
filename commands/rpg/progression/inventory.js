const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

// Memuat data statis item dari data/items.json
const itemsPath = path.join(__dirname, '../../../data/items.json');
const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

module.exports = {
  name: 'inventory',
  aliases: ['inv', 'bag', 'tas', 'rpginv', 'i'],
  description: 'Menampilkan isi kantong penyimpanan barang karakter Lunaria-mu menggunakan sistem kategori tombol.',
  category: 'rpg/progression',

  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Menampilkan isi kantong penyimpanan barang karakter Lunaria-mu menggunakan sistem kategori tombol.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI UTAMA: Wajib terdaftar lewat /profile
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      const noAccountEmbed = new EmbedBuilder()
        .setColor('#FF3333')
        .setTitle('❌ Akun Tidak Ditemukan')
        .setDescription(`Kamu belum terdaftar di semesta Lunaria. Silakan ketik perintah \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu untuk membuat karakter barumu!`);
      
      return context.reply({ embeds: [noAccountEmbed], ephemeral: true });
    }

    // 2. AMBIL DATA INVENTARIS DARI MONGODB + NULL GUARD SUNTIKAN AMAN
    let userInv = await Inventory.findOne({ userId });
    if (!userInv) {
      userInv = new Inventory({ userId, items: [] });
      await userInv.save();
    }

    // ==========================================
    // 🗂️ SISTEM PENGELOMPOKAN TIPE BARANG
    // ==========================================
    const categories = {
      equipment: [],
      consumable: [],
      material: []
    };

    userInv.items.forEach(invItem => {
      if (invItem.amount <= 0) return; // Abaikan item yang habis

      const itemInfo = itemsData[invItem.itemId];
      if (itemInfo) {
        const type = itemInfo.type || 'material';
        const targetCategory = categories[type] ? type : 'material';
        
        categories[targetCategory].push({
          id: invItem.itemId,
          name: itemInfo.name || invItem.itemId,
          emoji: itemInfo.emoji || '📦',
          amount: invItem.amount
        });
      }
    });

    // ==========================================
    // 🔤 ALPHABETICAL SORTING ENGINE (A-Z)
    // ==========================================
    const sortAlphabetically = (a, b) => a.name.localeCompare(b.name);
    categories.equipment.sort(sortAlphabetically);
    categories.consumable.sort(sortAlphabetically);
    categories.material.sort(sortAlphabetically);

    // ==========================================
    // 📦 DYNAMIC CHUNKING PAGINATION SYSTEM
    // ==========================================
    const ITEMS_PER_PAGE = 12; // Batasan jumlah item maksimal per panel panel
    
    const chunkArray = (array, size) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    const paginatedData = {
      equipment: chunkArray(categories.equipment, ITEMS_PER_PAGE),
      consumable: chunkArray(categories.consumable, ITEMS_PER_PAGE),
      material: chunkArray(categories.material, ITEMS_PER_PAGE)
    };

    // TRACKER STATUS PANEL LIVE NAVIGASI
    let currentCategory = paginatedData.equipment.length > 0 ? 'equipment' : (paginatedData.consumable.length > 0 ? 'consumable' : 'material');
    let currentPage = 0;

    // ==========================================
    // 🛠️ RENDER FUNCTION: PEMBUAT VISUAL EMBED & BUTTONS
    // ==========================================
    const generateInventoryMessage = () => {
      const categoryTitles = { equipment: '⚔️ Perlengkapan', consumable: '🧪 Konsumsi', material: '📦 Material' };
      const activeChunks = paginatedData[currentCategory];
      const totalPages = activeChunks.length;
      
      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setAuthor({ name: `Kantung Tas: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`🎒 Tas Karakter ➜ ${categoryTitles[currentCategory]}`)
        .setTimestamp();

      // Isi Konten List Menu Item (Hanya: Ikon, Nama, dan Jumlah)
      if (totalPages === 0) {
        embed.setDescription(`*Tidak ada simpanan barang di kategori ini.*`);
      } else {
        const currentChunk = activeChunks[currentPage];
        const itemsString = currentChunk.map(item => `${item.emoji} **${item.name}** × \`${item.amount}\``).join('\n');
        
        embed.setDescription(itemsString);
        embed.setFooter({ text: `Halaman ${currentPage + 1} dari ${totalPages} • Dompet: 💰 ${userRPG.gold.toLocaleString('id-ID')} Emas` });
      }

      // AKSI BARIS TOMBOL 1: Pemilih Kategori Utama
      const categoryRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_equipment')
          .setLabel('Perlengkapan')
          .setEmoji('⚔️')
          .setStyle(currentCategory === 'equipment' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_consumable')
          .setLabel('Konsumsi')
          .setEmoji('🧪')
          .setStyle(currentCategory === 'consumable' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_material')
          .setLabel('Material')
          .setEmoji('📦')
          .setStyle(currentCategory === 'material' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      // AKSI BARIS TOMBOL 2: Pengatur Halaman Arrow (Hanya muncul jika halaman > 1)
      const navigationRow = new ActionRowBuilder();
      if (totalPages > 1) {
        navigationRow.addComponents(
          new ButtonBuilder()
            .setCustomId('btn_prev')
            .setLabel('Sebelumnya')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Success)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('btn_next')
            .setLabel('Berikutnya')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Success)
            .setDisabled(currentPage === totalPages - 1)
        );
      }

      const components = [categoryRow];
      if (totalPages > 1) components.push(navigationRow);

      return { embeds: [embed], components };
    };

    // KIRIMKAN PANEL TAMPILAN AWAL SEBAGAI INTERACTION RESPONSE
    const initialPayload = generateInventoryMessage();
    const response = await context.reply({ ...initialPayload, fetchReply: true, ephemeral: false });

    // ==========================================
    // 🔁 INTERACTION COLLECTOR: PENANGKAP KLIK TOMBOL
    // ==========================================
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000 // Menutup pendeteksian otomatis setelah 1.5 Menit diam
    });

    collector.on('collect', async (interaction) => {
      // Kunci Keamanan: Hanya user penyembur perintah yang bisa mengklik tombol navigasi
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Hei! Ini adalah kantung tas milik petualang lain.', ephemeral: true });
      }

      const customId = interaction.customId;

      // Logika Operasi Tombol Kategori
      if (customId === 'btn_equipment') { currentCategory = 'equipment'; currentPage = 0; }
      else if (customId === 'btn_consumable') { currentCategory = 'consumable'; currentPage = 0; }
      else if (customId === 'btn_material') { currentCategory = 'material'; currentPage = 0; }
      
      // Logika Operasi Tombol Arrow Halaman
      else if (customId === 'btn_prev') { currentPage = Math.max(0, currentPage - 1); }
      else if (customId === 'btn_next') { currentPage = Math.min(paginatedData[currentCategory].length - 1, currentPage + 1); }

      // Update Tampilan Pesan Secara Instan
      const updatedPayload = generateInventoryMessage();
      await interaction.update(updatedPayload);
    });

    // Event ketika waktu collector habis (Mematikan komponen tombol agar tidak lag)
    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};