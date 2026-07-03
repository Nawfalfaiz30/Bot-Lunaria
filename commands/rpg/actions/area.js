const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const fs = require('fs');
const path = require('path');

// Memuat data area dan monsters untuk menampilkan ringkasan wilayah baru
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/area.json'), 'utf8'));
const monstersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/monsters.json'), 'utf8'));
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));

module.exports = {
  name: 'area',
  aliases: ['move', 'pindah', 'goto', 'zone'],
  description: 'Melihat daftar wilayah petualangan atau berpindah ke area yang sudah terbuka kuncinya.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('area')
    .setDescription('Melihat daftar wilayah petualangan atau berpindah ke area yang sudah terbuka kuncinya.')
    .addIntegerOption(opt => 
      opt.setName('target')
        .setDescription('Nomor area tujuan (Contoh: 2)')
        .setRequired(false)
    ),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI: Cek pendaftaran karakter
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      return context.reply({ 
        content: `❌ Kamu belum terdaftar! Ketik \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu.`, 
        ephemeral: true 
      });
    }

    // Ekstraksi input nomor area target dari sistem Hybrid
    let targetInput = isPrefix ? args[0] : context.options.getInteger('target');
    let targetArea = parseInt(targetInput);

    // ==========================================
    // KONDISI A: JIKA USER TIDAK MEMASUKKAN ARGUMEN (Cek Status Area)
    // ==========================================
    if (isNaN(targetArea)) {
      const currentAreaInfo = areaData[`area_${userRPG.current_area}`];
      
      const infoEmbed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🗺️ Peta Navigasi Dunia Lunaria')
        .setDescription(
          `Halo **${user.username}**, saat ini kamu sedang berada di:\n` +
          `📍 **${currentAreaInfo?.emoji || '🧭'} ${currentAreaInfo?.name || `Area ${userRPG.current_area}`}**\n\n` +
          `🔓 **Batas Maksimal Jelajahmu:** \`Area ${userRPG.max_area}\`\n` +
          `💡 *Ketik \`${isPrefix ? 'area [nomor]' : '/area [nomor]'}\` untuk berpindah ke lokasi lain yang sudah terbuka kuncinya.*`
        )
        .setTimestamp();

      // Tampilkan list area yang sudah terbuka kuncinya
      let areaListStr = '';
      for (let i = 1; i <= userRPG.max_area; i++) {
        const areaKey = `area_${i}`;
        if (areaData[areaKey]) {
          areaListStr += `${areaData[areaKey].emoji} **Area ${i}:** ${areaData[areaKey].name}\n`;
        }
      }
      
      infoEmbed.addFields({ name: '📜 Daftar Wilayah Terbuka Kuncinya (Unlocked Zones)', value: areaListStr || '*Tidak ada data area*' });
      return context.reply({ embeds: [infoEmbed] });
    }

    // ==========================================
    // KONDISI B: JIKA USER INGIN BERPINDAH AREA
    // ==========================================
    // 1. Validasi Batas Minimal Area Semesta Lunaria
    if (targetArea < 1) {
      return context.reply({ content: '❌ Nomor area tidak valid! Area paling rendah dimulai dari angka 1.', ephemeral: true });
    }

    // 2. Validasi Kunci Keamanan Batas Maksimal Progresi
    if (targetArea > userRPG.max_area) {
      return context.reply({ 
        content: `🔒 **Akses Ditolak!** Kamu belum membuka gerbang ke **Area ${targetArea}**.\n` +
                 `🏆 *Kalahkan Bos Gerbang Dungeon di \`Area ${userRPG.max_area}\` terlebih dahulu menggunakan perintah \`dungeon\` untuk melangkah maju!*`, 
        ephemeral: true 
      });
    }

    // 3. Validasi Jika Pemain Mencoba Pindah ke Area yang Sama
    if (targetArea === userRPG.current_area) {
      return context.reply({ content: `📍 Kamu sudah berada di **Area ${targetArea}** saat ini!`, ephemeral: true });
    }

    // 4. Ambil informasi dari area tujuan baru
    const targetAreaKey = `area_${targetArea}`;
    const newAreaInfo = areaData[targetAreaKey];
    if (!newAreaInfo) {
      return context.reply({ content: '❌ Kode wilayah area tersebut belum terdaftar di semesta Lunaria.', ephemeral: true });
    }

    // 5. EKSEKUSI PEMBARUAN AREA DI DATABASE MONGO
    userRPG.current_area = targetArea;
    await userRPG.save();

    // =================================================================
    // 🔍 FIX ENGINE: PARSING ARRAY DATA MONSTER SESUAI STRUKTUR HUNT
    // =================================================================
    const areaMonsters = monstersData[targetAreaKey]?.monsters;
    let monsterName = '*Tidak ada monster*';
    
    if (areaMonsters && areaMonsters.length > 0) {
      // Menggabungkan semua nama monster di area tersebut dengan pemisah koma jika lebih dari satu
      monsterName = areaMonsters.map(m => m.name).join(', ');
    }
    
    // Ambil data panen gathering dari itemsData
    const fishName = itemsData[newAreaInfo.gathering_available?.fish]?.name || 'Tidak ada';
    const oreName = itemsData[newAreaInfo.gathering_available?.mine]?.name || 'Tidak ada';
    const woodName = itemsData[newAreaInfo.gathering_available?.chop]?.name || 'Tidak ada';

    const moveEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🧭 Perjalanan Wilayah Baru')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `Kamu melangkah sejauh beberapa mil menembus kabut, melintasi perbatasan, dan tiba dengan selamat di lokasi baru:\n\n` +
        `📍 **${newAreaInfo.emoji} Area ${targetArea}: ${newAreaInfo.name}**\n\n` +
        `*Lingkungan sekitar dan ancaman bahayamu kini telah berubah! Seluruh perintah grinding-mu otomatis disesuaikan dengan ekosistem area ini.*`
      )
      .addFields(
        { 
          name: '⚔️ Ancaman Buruan (/hunt)', 
          value: `👾 Monster lokal: **${monsterName}**`, 
          inline: false 
        },
        { 
          name: '📦 Hasil Panen (/fish, /mine, /chop)', 
          value: `🐟 Perairan: **${fishName}**\n` +
                 `⛏️ Tambang: **${oreName}**\n` +
                 `🪓 Hutan: **${woodName}**`, 
          inline: false 
        }
      )
      .setTimestamp();

    return context.reply({ embeds: [moveEmbed] });
  }
};