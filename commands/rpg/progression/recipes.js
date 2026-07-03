const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'recipes',
  aliases: ['resep', 'recipe', 'r'],
  description: 'Melihat buku panduan resep memasak, alkimia, dan cetak biru penempaan Lunaria.',
  category: 'rpg/crafting',

  data: new SlashCommandBuilder()
    .setName('recipes')
    .setDescription('Melihat buku panduan resep memasak, alkimia, dan cetak biru penempaan Lunaria.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;

    // 1. Memuat database cetak biru resep secara real-time
    const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
    const recipesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/recipes.json'), 'utf8'));

    // Parsing & Restrukturisasi Data Smith agar kompatibel dengan sistem looping halaman
    const smithArray = [];
    for (const [targetId, details] of Object.entries(recipesData.smith || {})) {
      smithArray.push({
        result_id: targetId, 
        isSmith: true,
        material_id: details.material_id,
        gold_multiplier: details.gold_multiplier,
        ore_multiplier: details.ore_multiplier
      });
    }

    // 2. Parsing konversi objek data ke bentuk Array siap pakai
    const parsedRecipes = {
      cook: Object.values(recipesData.cooking || {}),
      alchemy: Object.values(recipesData.alchemy || {}),
      smith: smithArray 
    };

    // State Manager sesi halaman aktif user
    let currentCategory = 'cook';
    let currentPage = 0;
    const itemsPerPage = 5; 

    // =================================================================
    // 🎨 RENDER ENGINE: PEMBUATAN EMBED & ROW TOMBOL INTERAKTIF
    // =================================================================
    const generateRecipeMessage = () => {
      const targetList = parsedRecipes[currentCategory];
      const maxPage = Math.max(1, Math.ceil(targetList.length / itemsPerPage));

      // Pengaman pembatas halaman index array math
      if (currentPage >= maxPage) currentPage = maxPage - 1;
      if (currentPage < 0) currentPage = 0;

      const startIdx = currentPage * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const paginatedRecipes = targetList.slice(startIdx, endIdx);

      // Konfigurasi Tema Warna & Judul Dinamis per Kategori
      let embedColor = '#F39C12';
      let embedTitle = '🍳 Buku Resep Dapur Raya Lunaria';
      let hintText = `Gunakan perintah \`cook [nama_item]\` untuk mengeksekusi bahan baku.`;

      if (currentCategory === 'alchemy') {
        embedColor = '#9B59B6';
        embedTitle = '🧪 Kitab Agung Laboratorium Alkimia';
        hintText = `Gunakan perintah \`alchemy [nama_item]\` untuk meracik ramuan.`;
      } else if (currentCategory === 'smith') {
        embedColor = '#E67E22';
        embedTitle = '🔨 Cetak Biru Alkimia Pandai Besi Lunaria';
        hintText = `Gunakan perintah \`smith [slot]\` untuk meningkatkan level peralatan aktifmu.`;
      }

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(embedTitle)
        .setDescription(
          `Halo **${user.username}**, silakan pilih kategori kerajinan melalui tombol di bawah.\n` +
          `*${hintText}*\n` +
          `──────────────────────────────`
        )
        .setTimestamp()
        .setFooter({ text: `Kategori: ${currentCategory.toUpperCase()} • Halaman ${currentPage + 1} dari ${maxPage}` });

      if (paginatedRecipes.length === 0) {
        embed.addFields({ name: '📭 Belum Ada Formula', value: 'Tidak ada resep yang terdaftar di lembaran halaman ini.' });
      } else {
        paginatedRecipes.forEach(recipe => {
          const resultInfo = itemsData[recipe.result_id];
          if (resultInfo) {
            let ingredientLines = [];

            // Kondisional pembuatan baris deskripsi komponen bahan baku
            if (recipe.isSmith) {
              const oreInfo = itemsData[recipe.material_id];
              ingredientLines.push(`• **Batu Utama:** ${oreInfo?.emoji || '🪨'} ${oreInfo?.name || recipe.material_id}`);
              ingredientLines.push(`• **Pengali Koin:** \`x${recipe.gold_multiplier}\``);
              ingredientLines.push(`• **Pengali Batu:** \`x${recipe.ore_multiplier}\``);
              ingredientLines.push(`*Kebutuhan biaya dasar melambung mengikuti tingkatan level tempa (+1 s/d +15).*`);
            } else {
              for (const ingId in recipe.ingredients) {
                const ingInfo = itemsData[ingId];
                const reqAmount = recipe.ingredients[ingId];
                ingredientLines.push(`• ${ingInfo?.emoji || '📦'} ${ingInfo?.name || ingId} \`x${reqAmount}\``);
              }
            }

            // Tampilkan stat bonus/buff bawaan item hasil di dalam daftar resep
            let statInfo = "";
            if (resultInfo.permanent_stat) {
              statInfo = ` *(Permanen: +${resultInfo.permanent_stat.value} ${resultInfo.permanent_stat.target.toUpperCase()})*`;
            } else if (resultInfo.buff) {
              const bVal = resultInfo.buff.type === 'percent' ? `${Math.round(resultInfo.buff.value * 100)}%` : `+${resultInfo.buff.value}`;
              statInfo = ` *(Buff: ${bVal} ${resultInfo.buff.statTarget.toUpperCase()} [${Math.ceil(resultInfo.buff.duration / 60000)}m])*`;
            } else if (resultInfo.stats && Object.keys(resultInfo.stats).length > 0) {
              const baseStats = [];
              for (const [sName, sVal] of Object.entries(resultInfo.stats)) {
                baseStats.push(`${sName.toUpperCase()}: +${sVal}`);
              }
              statInfo = ` *(${baseStats.join(' | ')})*`;
            }

            // 🌟 PERBAIKAN: Deskripsi catatan cerita item dihapus total demi menghemat tempat layar chat
            embed.addFields({
              name: `${resultInfo.emoji} ${resultInfo.name}${statInfo}`,
              value: `**${recipe.isSmith ? '⚙️ Parameter Tempa:' : '📦 Bahan Dibutuhkan:'}**\n${ingredientLines.join('\n')}`,
              inline: false
            });
          }
        });
      }

      // ROW 1: Panel Tombol Pemilih Kategori Utama
      const categoryRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rcp_cat_cook')
          .setLabel('Dapur Memasak')
          .setEmoji('🍳')
          .setStyle(currentCategory === 'cook' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rcp_cat_alchemy')
          .setLabel('Laboratorium Alkimia')
          .setEmoji('🧪')
          .setStyle(currentCategory === 'alchemy' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rcp_cat_smith')
          .setLabel('Pandai Besi')
          .setEmoji('🔨')
          .setStyle(currentCategory === 'smith' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      // ROW 2: Panel Navigasi Lembar Balik Halaman
      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rcp_page_prev')
          .setLabel('Sebelumnya')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('rcp_page_next')
          .setLabel('Selanjutnya')
          .setStyle(ButtonStyle.Success)
          .setDisabled(currentPage >= maxPage - 1)
      );

      return { embeds: [embed], components: [categoryRow, navRow] };
    };

    const messagePayload = generateRecipeMessage();
    const response = await context.reply({ ...messagePayload, fetchReply: true });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({ content: '❌ Ini adalah lembar buku resep milik orang lain! Ketik \`recipes\` untuk membuka kitab panduanmu sendiri.', ephemeral: true });
      }

      const customId = i.customId;

      if (customId === 'rcp_cat_cook') {
        currentCategory = 'cook';
        currentPage = 0;
      } else if (customId === 'rcp_cat_alchemy') {
        currentCategory = 'alchemy';
        currentPage = 0;
      } else if (customId === 'rcp_cat_smith') {
        currentCategory = 'smith'; 
        currentPage = 0;
      } 
      else if (customId === 'rcp_page_prev') {
        currentPage--;
      } else if (customId === 'rcp_page_next') {
        currentPage++;
      }

      await i.update(generateRecipeMessage());
    });

    collector.on('end', () => {
      const finalPayload = generateRecipeMessage();
      finalPayload.components.forEach(row => {
        row.components.forEach(btn => btn.setDisabled(true));
      });
      response.edit(finalPayload).catch(() => {});
    });
  }
};