const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const fs = require('fs');
const path = require('path');

const classesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/classes.json'), 'utf8'));

module.exports = {
  name: 'skills',
  aliases: ['skill', 'jurus', 'activeskill'],
  description: 'Melihat daftar skill kelasmu atau memuat ulang kuota penggunaan skill aktif menggunakan nama skill.',
  category: 'rpg/actions',

  // 🌟 PERBAIKAN: Mengubah deskripsi opsi agar meminta Nama Skill, bukan ID murni
  data: new SlashCommandBuilder()
    .setName('skills')
    .setDescription('Mengakses buku rahasia mantera skill aktif kelas.')
    .addStringOption(opt => opt.setName('activate').setDescription('Nama lengkap skill yang ingin diisi kuotanya (Contoh: Frost Nova)').setRequired(false)),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    const userRPG = await RPG.findOne({ userId });
    if (!userRPG || !userRPG.class) {
      return context.reply({ content: '❌ Kamu belum memilih kelas! Silakan ambil kelas tempur dahulu.', ephemeral: true });
    }

    const playerClass = userRPG.class.toLowerCase();
    const classInfo = classesData[playerClass];
    if (!classInfo) return context.reply({ content: '❌ Data info kelas tidak ditemukan.', ephemeral: true });

    // 🧠 SMART PARSER: Menggabungkan seluruh argumen teks agar mendukung nama berspasi (e.g. "Frost Nova")
    let inputSkillName = isPrefix ? args.join(' ').trim().toLowerCase() : context.options.getString('activate')?.trim().toLowerCase();

    // TAMPILKAN DAFTAR MENU BUKU SKILL KELAS
    if (!inputSkillName) {
      const skillsEmbed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`${classInfo.emoji} Kitab Rahasia Sihir Kelas: ${classInfo.name}`)
        .setDescription(`Berikut daftar jurus tempurmu. Ketik \`skills [nama_skill]\` untuk memuat kuota penggunaan sebelum bertarung.\n──────────────────────────────`);

      classInfo.skills.forEach(s => {
        skillsEmbed.addFields({
          name: `📜 ${s.name}`, // Menyembunyikan tampilan ID teknis agar estetik
          value: `• **Biaya:** \`${s.mana_cost}\` MP | **Kuota Maks:** \`${s.max_uses}\` Kali Sesi\n• *"${s.description}"*`,
          inline: false
        });
      });

      // Mencari nama asli dari skill aktif saat ini untuk visualisasi yang ramah pengguna
      const currentSkill = classInfo.skills.find(s => s.id === userRPG.active_skill?.id);
      const activeText = userRPG.active_skill?.uses_left > 0 && currentSkill
        ? `🔥 **Aktif Saat Ini:** \`${currentSkill.name}\` *(Sisa Kuota: ${userRPG.active_skill.uses_left}x)*`
        : '📭 **Aktif Saat Ini:** Tidak ada skill yang termuat.';
      
      skillsEmbed.addFields({ name: '⚡ Status Slot Sihir Tubuh', value: activeText });
      return context.reply({ embeds: [skillsEmbed] });
    }

    // 🔄 REVERSE LOOKUP ENGINE: Mencari data skill berdasarkan nama asli (Case-Insensitive)
    const targetSkill = classInfo.skills.find(s => s.name.toLowerCase() === inputSkillName);
    if (!targetSkill) {
      return context.reply({ content: `❌ Skill bernama **"${isPrefix ? args.join(' ') : context.options.getString('activate')}"** tidak ditemukan di daftar kelas ${classInfo.name}!`, ephemeral: true });
    }

    // 🔒 PENGUNCI DATABASE: Blokir ganti jika sisa kuota skill lain masih ada
    if (userRPG.active_skill?.uses_left > 0 && userRPG.active_skill.id !== targetSkill.id) {
      const activeSkillData = classInfo.skills.find(s => s.id === userRPG.active_skill.id);
      const activeSkillName = activeSkillData ? activeSkillData.name : userRPG.active_skill.id;

      return context.reply({ 
        content: `🔒 **Akses Terkunci!** Kamu masih memiliki sisa kuota **${userRPG.active_skill.uses_left}x** pada skill \`${activeSkillName}\`. Habiskan dahulu di arena pertarungan sebelum memuat mantra baru!`, 
        ephemeral: true 
      });
    }

    // 💾 AMAN: Menyetel data ke database menggunakan ID asli agar sistem Combat Engine tetap sinkron
    userRPG.active_skill = { id: targetSkill.id, uses_left: targetSkill.max_uses };
    await userRPG.save();

    return context.reply({ content: `✨ Berhasil memuat mantra **[${targetSkill.name}]**! Kuota sebanyak **${targetSkill.max_uses}x** penggunaan siap dilepaskan di menu \`hunt\` atau \`dungeon\`.` });
  }
};