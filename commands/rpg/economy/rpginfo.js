const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const itemsPath = path.join(__dirname, '../../../data/items.json');
const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

const shopPath = path.join(__dirname, '../../../data/shop.json');
const shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));

module.exports = {
  name: 'rpginfo', 
  aliases: ['iteminfo', 'periksa', 'check'],
  description: 'Membedah rahasia kitab ensiklopedia item Lunaria secara mendalam.',
  category: 'rpg/core',

  data: new SlashCommandBuilder()
    .setName('rpginfo') 
    .setDescription('Membedah rahasia kitab ensiklopedia item Lunaria secara mendalam.')
    .addStringOption(opt => 
      opt.setName('item')
         .setDescription('Nama lengkap item yang ingin diperiksa (Contoh: Vampiric Shadow Dagger)')
         .setRequired(true)
    ),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    let inputStr = "";

    if (isPrefix) {
      if (!args || args.length === 0) {
        return context.reply({ content: '❌ Tuliskan nama item yang ingin kamu periksa! Contoh: `ln!rpginfo Iron Plate Mail`', ephemeral: true });
      }
      inputStr = args.join(' ').trim().toLowerCase();
    } else {
      inputStr = context.options.getString('item').trim().toLowerCase();
    }

    let itemId = null;
    let item = null;

    for (const [key, value] of Object.entries(itemsData)) {
      if (value.name && value.name.trim().toLowerCase() === inputStr) {
        itemId = key;
        item = value;
        break;
      }
    }

    if (!item) {
      for (const [key, value] of Object.entries(itemsData)) {
        if (value.name && value.name.trim().toLowerCase().includes(inputStr)) {
          itemId = key;
          item = value;
          break;
        }
      }
    }

    if (!itemId || !item) {
      return context.reply({ 
        content: `❌ Barang bernama **"${isPrefix ? args.join(' ') : context.options.getString('item')}"** misterius, tidak tercatat di arsip panduan Lunaria!`, 
        ephemeral: true 
      });
    }

    // =================================================================
    // 🎛️ HYBRID PRICING CALCULATOR ENGINE (Sinkron dengan sell.js)
    // =================================================================
    const shopProduct = shopData[itemId];
    let finalSellPrice = 0;

    if (shopProduct) {
      // Kebijakan Toko: Potong 80% dari harga beli resmi di shop.json
      finalSellPrice = Math.round(shopProduct.buy_price * 0.80);
    } else {
      // Kebijakan Kustom: Ambil nilai bersih langsung dari properti sell_price di items.json
      finalSellPrice = item.sell_price || 0;
    }

    const typeTitles = { equipment: '🛡️ Perlengkapan (Equipment)', consumable: '🧪 Konsumsi (Consumable)', material: '📦 Bahan Mentah (Material)' };

    const infoEmbed = new EmbedBuilder()
      .setColor(item.type === 'equipment' ? '#3498DB' : (item.type === 'consumable' ? '#E74C3C' : '#2ECC71'))
      .setTitle(`${item.emoji || '📦'} ${item.name}`)
      .setDescription(`*"${item.description || 'Tidak ada deskripsi catatan.'}"*\n────────────────────────────────────────`)
      .addFields(
        // 🌟 PERBAIKAN MUTAKHIR: "Harga Resmi Toko" dihapus total, "Nilai Jual Bersih" dikembalikan utuh ke panel
        { name: '🗂️ Klasifikasi Tipe', value: `\`${typeTitles[item.type] || item.type}\``, inline: true },
        { name: '💰 Nilai Jual Bersih', value: `🪙 \`${finalSellPrice.toLocaleString('id-ID')}\` Emas`, inline: true }
      )
      .setTimestamp();

    if (item.type === 'equipment') {
      infoEmbed.addFields({ name: '📐 Letak Pemasangan (Slot)', value: `\`${item.slot ? item.slot.toUpperCase() : 'TOOLS'}\``, inline: false });
      
      if (item.stats && Object.keys(item.stats).length > 0) {
        let statsString = "";
        for (const [statName, statValue] of Object.entries(item.stats)) {
          statsString += `• **${statName.toUpperCase()}:** \`+${statValue.toLocaleString('id-ID')}\`\n`;
        }
        infoEmbed.addFields({ name: '📊 Parameter Bonus Atribut', value: statsString, inline: true });
      }

      infoEmbed.addFields({ name: '🧬 Modul Bakat Pasif (Passive ID)', value: `\`${item.passive_id || 'Tidak Memiliki Efek Pasif'}\``, inline: true });
    }

    if (item.type === 'consumable') {
      if (item.effects && (item.effects.heal_hp > 0 || item.effects.heal_mana > 0)) {
        infoEmbed.addFields({
          name: '❤️‍🩹 Efek Pemulihan Instan',
          value: `• **Poin Darah HP :** \`+${item.effects.heal_hp || 0}\`\n• **Energi Mana MP:** \`+${item.effects.heal_mana || 0}\``,
          inline: false
        });
      }

      if (item.permanent_stat && item.permanent_stat.target) {
        infoEmbed.addFields({
          name: '🧬 Berkah Permanen Karakter (Permanent Stat)',
          value: `• Menyuntikkan ekstra atribut **${item.permanent_stat.target.toUpperCase()}** mutlak sebesar \`+${item.permanent_stat.value}\` poin ke dalam tubuh secara abadi pasca dikonsumsi.`,
          inline: false
        });
      }

      if (item.buff && item.buff.statTarget) {
        const minutes = Math.floor(item.buff.duration / 60000);
        const seconds = ((item.buff.duration % 60000) / 1000).toFixed(0);
        const durationText = `${minutes > 0 ? `${minutes} Menit ` : ''}${seconds > 0 ? `${seconds} Detik` : ''}`;

        infoEmbed.addFields({
          name: '🧪 Efek Kimia Sementara (Temporal Buff)',
          value: `• Modifikasi Target: **${item.buff.statTarget}**\n• Bobot Suntikan: \`+${item.buff.value * (item.buff.type === 'percent' ? 100 : 1)}${item.buff.type === 'percent' ? '%' : ''}\`\n• Masa Kedaluwarsa Efek: \`${durationText}\``,
          inline: false
        });
      }
    }

    infoEmbed.addFields({ name: '────────────────────────────────────────', value: `*Gunakan perintah penjualan \`sell [nama_item]\` jika ingin mencairkannya menjadi Emas.*` });

    return context.reply({ embeds: [infoEmbed] });
  }
};