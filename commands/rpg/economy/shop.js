const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'shop',
  aliases: ['toko', 'rpgshop', 't'],
  description: 'Melihat pasar swalayan Lunaria dengan detail pasif otomatis dan urutan berdasarkan harga beli.',
  category: 'rpg/economy',

  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Melihat pasar swalayan Lunaria dengan detail pasif otomatis dan urutan berdasarkan harga beli.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. Validasi pendaftaran akun
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      return context.reply({ 
        content: `❌ Kamu belum terdaftar! Ketik \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu.`, 
        ephemeral: true 
      });
    }

    // 2. Memuat database statis secara real-time (Termasuk passives.json)
    const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
    const shopData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/shop.json'), 'utf8'));
    const passivesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/passives.json'), 'utf8')); // 🌟 BARU: Mengambil otomatis dari database passives

    // 3. Kontener Pengelompokan & Pemrosesan Data Toko
    const parsedCategories = { weapon: [], armor: [], tool: [], consumable: [] };

    for (const id in shopData) {
      const shopItem = shopData[id];
      const itemInfo = itemsData[shopItem.item_id];
      
      if (itemInfo) {
        parsedCategories[shopItem.category].push({
          id: shopItem.item_id,
          shop: shopItem,
          info: itemInfo
        });
      }
    }

    // =================================================================
    // 🔄 PERBAIKAN SORTING ENGINE: URUTKAN BERDASARKAN HARGA BELI (CHEAPEST FIRST)
    // =================================================================
    for (const cat in parsedCategories) {
      parsedCategories[cat].sort((a, b) => a.shop.buy_price - b.shop.buy_price);
    }

    // State Manager sesi interaksi user
    let currentCategory = 'weapon';
    let currentPage = 0;
    const itemsPerPage = 5;

    // =================================================================
    // 📊 UTILITY HELPER 1: EKSTRAKSI ATRIBUT STATUS SECARA DINAMIS
    // =================================================================
    const formatAttributes = (info) => {
      let attrs = [];
      
      if (info.stats) {
        if (info.stats.atk) attrs.push(`⚔️ ATK: \`${info.stats.atk}\``);
        if (info.stats.def) attrs.push(`🛡️ DEF: \`${info.stats.def}\``);
        if (info.stats.hp) attrs.push(`❤️ HP: \`+${info.stats.hp}\``);
        if (info.stats.mana) attrs.push(`💧 MP: \`+${info.stats.mana}\``);
        if (info.stats.agi) attrs.push(`💨 AGI: \`+${info.stats.agi}\``);
        if (info.stats.int) attrs.push(`🔮 INT: \`+${info.stats.int}\``);
      }
      
      if (info.effects) {
        if (info.effects.heal_hp) attrs.push(`❤️ HP Heal: \`+${info.effects.heal_hp}\``);
        if (info.effects.heal_mana) attrs.push(`💧 MP Heal: \`+${info.effects.heal_mana}\``);
      }
      
      if (info.buff) {
        let targetClean = info.buff.statTarget.toUpperCase();
        if (targetClean === 'ATK_PCT') targetClean = 'ATK%';
        if (targetClean === 'DEF_PCT') targetClean = 'DEF%';
        if (targetClean === 'XP_PCT') targetClean = 'XP%';

        const valueStr = info.buff.type === 'percent' 
          ? `+${Math.round(info.buff.value * 100)}%` 
          : `+${info.buff.value}`;
        
        const durationMinutes = Math.ceil(info.buff.duration / 60000);
        attrs.push(`✨ Buff: \`${valueStr}\` ${targetClean} (${durationMinutes}m)`);
      }
      
      return attrs.length > 0 ? `*(${attrs.join(' | ')})*` : '';
    };

    // =================================================================
    // 🔮 PERBAIKAN AUTOMATION: AMBIL PASIF OTOMATIS DARI PASSIVES.JSON
    // =================================================================
    const getPassiveDescription = (passiveId) => {
      if (!passiveId) return null;
      
      // Mengambil data murni live dari passives.json milikmu
      const passive = passivesData[passiveId];
      if (passive) {
        return `**${passive.name}** • *${passive.description}*`;
      }
      
      return `Efek Khusus Bersyarat (\`${passiveId}\`)`;
    };

    // =================================================================
    // 🪙 UTILITY HELPER 3: PENGAMAN ANGKA EMAS RAKSASA (ANTI-OVERFLOW)
    // =================================================================
    let goldString = "0";
    try {
      goldString = BigInt(userRPG.gold).toLocaleString('id-ID');
    } catch (e) {
      goldString = Number(userRPG.gold).toLocaleString('id-ID');
    }

    // =================================================================
    // 🎨 RENDER ENGINE: PEMBUATAN EMBED & ROW TOMBOL INTERAKTIF
    // =================================================================
    const generateShopMessage = () => {
      const itemsList = parsedCategories[currentCategory];
      const maxPage = Math.max(1, Math.ceil(itemsList.length / itemsPerPage));
      
      const startIdx = currentPage * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const paginatedItems = itemsList.slice(startIdx, endIdx);

      const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🛒 Pasar Raya Pusat Semesta Lunaria')
        .setDescription(
          `Selamat datang di bursa niaga, **${user.username}**!\n` +
          `Uangmu saat ini: 💰 \`${goldString}\` Emas\n` +
          `Gunakan perintah \`buy [nama_item_lengkap]\` untuk bertransaksi.\n` +
          `──────────────────────────────`
        )
        .setTimestamp()
        .setFooter({ text: `Kategori: ${currentCategory.toUpperCase()} • Halaman ${currentPage + 1} dari ${maxPage}` });

      if (paginatedItems.length === 0) {
        embed.addFields({ name: '📭 Stok Kosong', value: 'Tidak ada barang di kategori ini.' });
      } else {
        let textLines = paginatedItems.map((item) => {
          const attrStr = formatAttributes(item.info);
          const passiveDesc = getPassiveDescription(item.info.passive_id);
          
          let itemBlock = `${item.info.emoji} **${item.info.name}**\n` +
                          `├─ 💰 \`${item.shop.buy_price.toLocaleString('id-ID')}\` Gold • ${attrStr}\n`;
          
          if (passiveDesc) {
            itemBlock += `├─ ✨ **Pasif:** ${passiveDesc}\n`;
          }
          
          itemBlock += `└─ *"${item.info.description || 'Tidak ada deskripsi.'}"*`;
          return itemBlock;
        }).join('\n\n');
        
        embed.setDescription(`${embed.data.description}\n\n${textLines}`);
      }

      // ROW 1: Tombol Navigasi Menu Kategori Utama
      const categoryRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('cat_weapon')
          .setLabel('Senjata')
          .setEmoji('⚔️')
          .setStyle(currentCategory === 'weapon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('cat_armor')
          .setLabel('armor')
          .setEmoji('🛡️')
          .setStyle(currentCategory === 'armor' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('cat_tool')
          .setLabel('Alat Kerja')
          .setEmoji('⛏️')
          .setStyle(currentCategory === 'tool' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('cat_consumable')
          .setLabel('Konsumsi')
          .setEmoji('🧪')
          .setStyle(currentCategory === 'consumable' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      // ROW 2: Tombol Navigasi Pergantian Halaman (Pagination Arrows)
      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('page_prev')
          .setLabel('Sebelumnya')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('page_next')
          .setLabel('Selanjutnya')
          .setStyle(ButtonStyle.Success)
          .setDisabled(currentPage >= maxPage - 1)
      );

      return { embeds: [embed], components: [categoryRow, navRow] };
    };

    // Kirim pesan inisiasi awal toko ke Discord
    const messagePayload = generateShopMessage();
    const response = await context.reply({ ...messagePayload, fetchReply: true });

    // =================================================================
    // 🔌 ENGINE INTERAKSI COLLECTOR COMPONENT (BERDURASI 2 MENIT)
    // =================================================================
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 // Waktu aktif menu: 2 menit
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({ content: '❌ Ini adalah menu pasar milik orang lain! Ketik \`/shop\` untuk melihat tokomu sendiri.', ephemeral: true });
      }

      const customId = i.customId;

      if (customId.startsWith('cat_')) {
        currentCategory = customId.replace('cat_', '');
        currentPage = 0; 
      } 
      else if (customId === 'page_prev') {
        currentPage--;
      } else if (customId === 'page_next') {
        currentPage++;
      }

      await i.update(generateShopMessage());
    });

    // Matikan tombol jika durasi sesi belanja berakhir (Timeout Security)
    collector.on('end', () => {
      const finalPayload = generateShopMessage();
      finalPayload.components.forEach(row => {
        row.components.forEach(btn => btn.setDisabled(true));
      });
      response.edit(finalPayload).catch(() => {});
    });
  }
};