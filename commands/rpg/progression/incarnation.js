const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const Cooldown = require('../../../models/cooldownSchema');

module.exports = {
  name: 'incarnation',
  aliases: ['inkarnasi', 'tt', 'reincarnate', 'reset'],
  description: 'Melakukan ritual inkarnasi untuk terlahir kembali dengan mempertahankan berkat status abadi.',
  category: 'rpg/progression',

  data: new SlashCommandBuilder()
    .setName('incarnation')
    .setDescription('Melakukan ritual inkarnasi untuk terlahir kembali dengan mempertahankan berkat status abadi.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI: Cek pendaftaran akun karakter
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) return context.reply({ content: '❌ Kamu belum terdaftar!', ephemeral: true });

    // Syarat gerbang waktu tetap terkunci sebelum menaklukkan area 15
    if (userRPG.max_area < 15) {
      return context.reply({ 
        content: `🔒 **Gerbang Inkarnasi Terkunci Segel Kosmik!** Kamu harus menaklukkan Bos Final di **Area 15** terlebih dahulu sebelum diizinkan menembus siklus samsara.`, 
        ephemeral: true 
      });
    }

    // =================================================================
    // 🎛️ PANEL TOMBOL KONFIRMASI INTERAKTIF (SAFETY GUARD ENGINE)
    // =================================================================
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_inc')
        .setLabel('Ya, Ritual Inkarnasi')
        .setEmoji('🔮')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_inc')
        .setLabel('Tidak, Batalkan')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
    );

    const confirmEmbed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('🌌 RITUAL AGUNG INKARNASI')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `Apakah kamu sudah membulatkan tekad untuk menghancurkan raga fanamu saat ini demi melangkah ke tingkat eksistensi jiwa yang lebih tinggi?\n\n` +
        `⚠️ **Dampak Pembedahan Lini Masa Karakter:**\n` +
        `• Level karakter kembali ke **` + "`1`" + `** dan Kelas dibersihkan menjadi **Novice**.\n` +
        `• Peta petualangan dikunci ulang, memulai kembali dari **Area 1**.\n` +
        `• Seluruh armor, senjata, dan perkakas aktif terpasang **hancur menjadi debu kosmik**.\n` +
        `• Seluruh jumlah material di tas (ikan, ore, dll) & Gold disusutkan tersisa **\`8%\`**.\n\n` +
        `✨ **Berkah Suci Reinkarnasi ( cheat ):**\n` +
        `• 🌟 **Berkat Atribut Permanen Dapur Memasak BERTAHAN UTUH 100% (TIDAK RESET!)**.\n` +
        `• Membuka angka kelipatan multiplier multiplier XP & Gold permanen yang jauh lebih masif.\n\n` +
        `*Silakan konfirmasi tindakanmu melalui panel tombol di bawah dalam waktu 30 detik!*`
      )
      .setTimestamp();

    const response = await context.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true });

    // Pasang mesin penangkap sinyal ketukan tombol
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async (i) => {
      // Security check agar player lain tidak bisa mengacaukan pilihan
      if (i.user.id !== user.id) {
        return i.reply({ content: '❌ Ini adalah lingkaran ritual inkarnasi milik petualang lain!', ephemeral: true });
      }

      // KONDISI A: Pemain Memilih Batal
      if (i.customId === 'cancel_inc') {
        collector.stop('cancelled');
        return;
      }

      // KONDISI B: Pemain Memilih YA (EKSEKUSI TRANSISI)
      if (i.customId === 'confirm_inc') {
        await i.deferUpdate();

        // Tarik live data teranyar dari cloud untuk menghindari glitch duplikasi koin
        const liveRPG = await RPG.findOne({ userId });
        const userInv = await Inventory.findOne({ userId });

        // =================================================================
        // 🔥 THE GREAT RESIDUAL RESET ENGINE (8% RETENTION & 100% PERMANENT)
        // =================================================================
        
        // 🌟 PERBAIKAN: Blok penyusutan permanent_bonus dihapus total agar status abadi bertahan 100%!
        
        // B. PENYUSUTAN TAS INVENTARIS (HANYA DISISAKAN 8% SAJA)
        if (userInv && userInv.items && userInv.items.length > 0) {
          userInv.items = userInv.items
            .map(item => {
              item.amount = Math.round(item.amount * 0.08); // Kunci retensi 8% kuantitas
              return item;
            })
            .filter(item => item.amount > 0); // Lenyapkan jika pembulatan menyentuh angka 0
        }

        // C. PENYUSUTAN KEKAYAAN DOMPET (SISA 8%)
        liveRPG.gold = Math.round(liveRPG.gold * 0.08);

        // Menyetel ulang seluruh parameter progresi dasar
        liveRPG.level = 1;
        liveRPG.xp = 0;
        liveRPG.hp = 100;    
        liveRPG.mana = 20;   
        liveRPG.class = null; 
        liveRPG.current_area = 1;
        liveRPG.max_area = 1;
        liveRPG.timetravel_count += 1; // Tetap memakai variabel skema agar statCalculator terintegrasi
        
        // Lepas total perlengkapan
        liveRPG.equipment = { weapon: null, armor: null, fishing_rod: null, pickaxe: null, axe: null };
        
        // Simpan pembukuan mutasi ke MongoDB
        await liveRPG.save();
        if (userInv) await userInv.save();

        // Reset Cooldown Aktivitas demi start akselerasi instan pasca lahir kembali
        const userCd = await Cooldown.findOne({ userId });
        if (userCd) {
          userCd.chop = new Date(0);
          userCd.mine = new Date(0);
          userCd.fish = new Date(0);
          userCd.hunt = new Date(0);
          userCd.dungeon = new Date(0);
          await userCd.save();
        }

        const successEmbed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setTitle('✨ TRANSISI DIMENSI: INKARNASI BERHASIL SEJATI!')
          .setDescription(
            `Raga lama hancur berkeping-keping, jiwamu menembus siklus samsara astral dan terlahir kembali di lini masa peradaban baru!\n` +
            `Kamu kini menggenggam **Tingkat Inkarnasi: ${liveRPG.timetravel_count}**.\n\n` +
            `🪐 **Manifestasi Berkat Inkarnasi Kuantum:**\n` +
            `• 🌟 **Berkat Agung:** Seluruh parameter status masakan dapur bertahan utuh **\`100%\`** tanpa ada pengurangan!\n` +
            `• Tabungan emas dan kuantitas komoditas mentah (ikan, ore, kayu) berhasil diselamatkan sebanyak **\`8%\`**.\n` +
            `• Seluruh armor/senjata aktif yang melekat telah sirna menjadi debu kosmik.\n\n` +
            `Selamat berjuang kembali dari Area 1 dengan bekal kekuatan spiritual abadi masa lalumu!`
          )
          .setTimestamp();

        // Perbarui pesan interaktif awal menjadi panel sukses utuh tanpa tombol lagi
        await i.editReply({ embeds: [successEmbed], components: [] });
        collector.stop('success');
      }
    });

    // ==========================================
    // JANITOR MONITOR: PEMBERSIHAN SESI RITUAL
    // ==========================================
    collector.on('end', async (collected, reason) => {
      if (reason === 'success') return;

      if (reason === 'cancelled') {
        const cancelEmbed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle('❌ Ritual Inkarnasi Dibatalkan')
          .setDescription('Kamu memilih untuk melangkah mundur dari lingkaran sihir dan menahan jiwamu di raga saat ini. Kumpulkan persiapan lebih matang sebelum berevolusi!');
        
        if (isPrefix) await response.edit({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        else await context.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
      } else {
        // Pemicu Timeout jika pemain melamun lebih dari 30 detik
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#7F8C8D')
          .setTitle('⏳ Waktu Ritual Kadaluwarsa')
          .setDescription('Fokus spiritualmu terpecah karena terlalu lama berpikir! Aliran energi sihir inkarnasi memudar dan lingkaran sihir menutup otomatis.');
        
        if (isPrefix) await response.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        else await context.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  }
};