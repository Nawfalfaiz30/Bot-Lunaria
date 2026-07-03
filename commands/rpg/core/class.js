const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType 
} = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const fs = require('fs');
const path = require('path');

// Memuat data statis kelas dari Fase 1
const classesPath = path.join(__dirname, '../../../data/classes.json');
const classesData = JSON.parse(fs.readFileSync(classesPath, 'utf8'));

module.exports = {
  // ==========================================
  // PROPERTI UNTUK PREFIX HANDLER (Wajib ada)
  // ==========================================
  name: 'classes',
  aliases: ['class', 'rpgclasses', 'rpgc', 'c'], 
  description: 'Melihat informasi dan memilih kelas karakter Lunaria-mu.',
  category: 'rpg/core',

  // ==========================================
  // PROPERTI UNTUK SLASH COMMAND HANDLER
  // ==========================================
  data: new SlashCommandBuilder()
    .setName('classes')
    .setDescription('Melihat informasi dan memilih kelas karakter Lunaria-mu.'),

  // ==========================================
  // TUNGGAL GATEWAY EXECUTE (Mendukung Teks & Slash)
  // ==========================================
  async execute(context, args, client) {
    // DETEKSI OTOMATIS: Jika memiliki properti 'author', berarti ini Message (Prefix)
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI ATURAN UTAMA: Wajib terdaftar lewat profile terlebih dahulu
    const userRPG = await RPG.findOne({ userId });

    if (!userRPG) {
      const registerEmbed = new EmbedBuilder()
        .setColor('#FF3333')
        .setTitle('❌ Akses Ditolak!')
        .setDescription(
          `Kamu belum terdaftar di dunia fantasi **Lunaria**.\n\n` +
          `Silakan gunakan perintah \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu untuk mendaftarkan ID karakter barumu sebelum bisa memilih kelas!`
        )
        .setTimestamp();

      // Sesuaikan opsi reply (Prefix tidak mendukung ephemeral)
      return context.reply({ 
        embeds: [registerEmbed], 
        ephemeral: !isPrefix 
      });
    }

    // 2. VALIDASI KEDUA: Cek apakah user sudah memiliki kelas
    if (userRPG.class) {
      const classInfo = classesData[userRPG.class.toLowerCase()];
      const emoji = classInfo ? classInfo.emoji : '🛡️';
      const className = classInfo ? classInfo.name : userRPG.class;

      const alreadyHasClassEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🛡️ Kelas Sudah Terkunci')
        .setDescription(
          `Kamu sudah memilih jalan hidup sebagai seorang **${emoji} ${className}**.\n\n` +
          `*Untuk saat ini, fitur pergantian kelas belum tersedia demi menjaga keadilan statistik karaktermu.*`
        )
        .setTimestamp();

      return context.reply({ 
        embeds: [alreadyHasClassEmbed], 
        ephemeral: !isPrefix 
      });
    }

    // 3. JIKA LOLOS VALIDASI: Susun Menu Dropdown Pemilihan Kelas
    const selectionEmbed = new EmbedBuilder()
      .setColor('#33AAFF')
      .setTitle('🎭 Pilih Kelas Karaktermu')
      .setDescription(
        `Selamat datang di gerbang takdir, **${user.username}**!\n` +
        `Pilihlah satu dari 5 kelas di bawah ini menggunakan menu dropdown di bawah.`
      )
      .setTimestamp();

    const menuOptions = [];
    for (const key in classesData) {
      const cls = classesData[key];
      
      selectionEmbed.addFields({
        name: `${cls.emoji} ${cls.name}`,
        value: `*${cls.description}*\n**Stat Awal:** STR ${cls.base_attributes.str} | AGI ${cls.base_attributes.agi} | INT ${cls.base_attributes.int} | VIT ${cls.base_attributes.vit}`,
        inline: false
      });

      menuOptions.push({
        label: cls.name,
        description: cls.description.substring(0, 50) + '...',
        value: key,
        emoji: cls.emoji
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_class_lunaria')
      .setPlaceholder('👉 Pilih kelas impianmu di sini...')
      .addOptions(menuOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Ambil respons pesan (Slash membutuhkan fetchReply agar mengembalikan objek Message)
    let response;
    if (isPrefix) {
      response = await context.reply({ embeds: [selectionEmbed], components: [row] });
    } else {
      response = await context.reply({ embeds: [selectionEmbed], components: [row], fetchReply: true });
    }

    // 4. COLLECTOR ENGINE (Sama-sama bekerja menggunakan objek Message)
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000 
    });

    collector.on('collect', async (i) => {
      // Amankan agar hanya pengetik perintah asli yang bisa berinteraksi
      if (i.user.id !== user.id) {
        return i.reply({ content: '❌ Menu ini bukan milikmu!', ephemeral: true });
      }

      const selectedClassKey = i.values[0];
      const chosenClass = classesData[selectedClassKey];

      // Double-check perlindungan data di database ter-update
      const reCheckUser = await RPG.findOne({ userId });
      if (reCheckUser && reCheckUser.class) {
        return i.update({ content: '❌ Kamu terdeteksi sudah memiliki kelas!', embeds: [], components: [] });
      }

      // Simpan kelas baru pilihan pemain ke MongoDB
      await RPG.updateOne({ userId }, { $set: { class: chosenClass.name } });

      const successEmbed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🎉 Kelas Berhasil Dipilih!')
        .setDescription(
          `Selamat! **${i.user.username}** resmi menjadi seorang **${chosenClass.emoji} ${chosenClass.name}**!\n\n` +
          `Ketik \`${isPrefix ? '' : '/'}${isPrefix ? 'profile' : 'profile'}\` kembali untuk melihat perubahan status tempur barumu.`
        )
        .setTimestamp();

      await i.update({ embeds: [successEmbed], components: [] });
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#7289DA')
          .setTitle('⏳ Waktu Pemilihan Habis')
          .setDescription('Waktu memilih kelas telah habis (60 detik). Silakan jalankan kembali perintah ini.');

        if (isPrefix) {
          await response.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => null);
        } else {
          await context.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => null);
        }
      }
    });
  }
};