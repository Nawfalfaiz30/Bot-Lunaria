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
  description: 'Melakukan ritual reinkarnasi setelah mengalahkan Boss Final untuk mempertahankan status abadi.',
  category: 'rpg/progression',

  data: new SlashCommandBuilder()
    .setName('incarnation')
    .setDescription('Melakukan ritual reinkarnasi setelah mengalahkan Boss Final untuk mempertahankan status abadi.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) return context.reply({ content: '❌ Jiwamu belum terdaftar! Ketik \`profile\` untuk memulai.', ephemeral: true });

    // Validasi verifikasi pemeriksaan kelulusan dungeon area 15 murni lewat kustom flag
    const isBoss15Defeated = userRPG.refine && userRPG.refine.boss_15_cleared === true;

    if (!isBoss15Defeated) {
      return context.reply({ 
        content: `🔒 **Gerbang Reinkarnasi Terkunci Segel Sihir Tertinggi!** Kamu baru sekadar mencapai wilayah akhir. Kamu diwajibkan menundukkan **Goddess of Creation** di Dungeon **Area 15 (Puncak Yggdrasil)** terlebih dahulu sebelum diizinkan melompati takdir reinkarnasi!`, 
        ephemeral: true 
      });
    }

    // PANEL TOMBOL
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_inc')
        .setLabel('Ya, Ritual Reinkarnasi')
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
      .setTitle('✨ RITUAL AGUNG INKARNASI (ASCENSION)')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `Apakah kamu sudah membulatkan tekad untuk menghancurkan raga fanamu saat ini demi melangkah ke tingkat eksistensi pahlawan yang lebih tinggi?\n\n` +
        `⚠️ **Dampak Pembalikan Takdir Karakter:**\n` +
        `• Level kembali ke **\`1\`** dan Kelas dibersihkan menjadi **Novice**.\n` +
        `• Peta dikunci ulang, memulai kembali petualangan dari **Area 1**.\n` +
        `• Seluruh senjata, armor, dan perkakas aktif terpasang **hancur menjadi Debu Mana Purba**.\n` +
        `• Seluruh material di tas & simpanan Gold disusutkan tersisa **\`8%\`**.\n\n` +
        `✨ **Berkat Jiwa Abadi (Blessing):**\n` +
        `• 🌟 **Berkat Atribut Permanen Dapur Memasak BERTAHAN UTUH 100% (TIDAK RESET!)**.\n` +
        `• Membuka angka kelipatan multiplier XP & Gold permanen yang jauh lebih masif dari Dewi.\n\n` +
        `*Silakan konfirmasi tindakanmu melalui panel di bawah dalam waktu 30 detik!*`
      )
      .setTimestamp();

    const response = await context.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({ content: '❌ Ini adalah lingkaran ritual reinkarnasi milik petualang lain!', ephemeral: true });
      }

      if (i.customId === 'cancel_inc') {
        collector.stop('cancelled');
        return;
      }

      if (i.customId === 'confirm_inc') {
        await i.deferUpdate();

        const liveRPG = await RPG.findOne({ userId });
        const userInv = await Inventory.findOne({ userId });

        // PENYUSUTAN TAS (SISA 8%)
        if (userInv && userInv.items && userInv.items.length > 0) {
          userInv.items = userInv.items
            .map(item => {
              item.amount = Math.round(item.amount * 0.08);
              return item;
            })
            .filter(item => item.amount > 0);
        }

        // PENYUSUTAN GOLD (SISA 8%)
        liveRPG.gold = Math.round(liveRPG.gold * 0.08);

        // RESET PROGRESSI DASAR
        liveRPG.level = 1;
        liveRPG.xp = 0;
        liveRPG.hp = 160;    
        liveRPG.mana = 45;   
        liveRPG.class = null; 
        liveRPG.current_area = 1;
        liveRPG.max_area = 1;  
        liveRPG.timetravel_count += 1;
        
        // Membersihkan total flag kelulusan boss area 15 pasca lahir kembali ke siklus baru
        if (liveRPG.refine) {
          liveRPG.refine.boss_15_cleared = false;
          liveRPG.markModified('refine');
        }
        
        liveRPG.equipment = { weapon: null, armor: null, fishing_rod: null, pickaxe: null, axe: null };
        
        await liveRPG.save();
        if (userInv) await userInv.save();

        // RESET TOTAL COOLDOWN
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
          .setTitle('✨ BERKAH DEWI: REINKARNASI JIWA SUCI BERHASIL COMPLETED!')
          .setDescription(
            `Raga lama melebur, jiwamu menembus siklus samsara dunia dan terlahir kembali!\n` +
            `Kamu kini menggenggam **Tingkat Reinkarnasi (Ascension): Tier ${liveRPG.timetravel_count}**.\n\n` +
            `🪐 **Manifestasi Berkat Jiwa Abadi:**\n` +
            `• 🌟 **Berkat Agung:** Seluruh status permanen makanan dapur bertahan utuh **\`100%\`** tanpa ada pengurangan!\n` +
            `• Pasokan koin emas dan komoditas tas berhasil diselamatkan sebanyak **\`8%\`**.\n\n` +
            `Selamat berjuang kembali dari Area 1 dengan bekal kekuatan spiritual masa lalumu!`
          )
          .setTimestamp();

        if (isPrefix) await response.edit({ embeds: [successEmbed], components: [] });
        else await i.editReply({ embeds: [successEmbed], components: [] });
        collector.stop('success');
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'success') return;

      if (reason === 'cancelled') {
        const cancelEmbed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle('❌ Ritual Reinkarnasi Dibatalkan')
          .setDescription('Kamu memilih mundur dari lingkaran mantra. Persiapkan dirimu lebih matang!');
        
        if (isPrefix) await response.edit({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        else await context.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
      } else {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#7F8C8D')
          .setTitle('⏳ Waktu Ritual Kadaluwarsa')
          .setDescription('Fokus spiritualmu terpecah karena melamun! Aliran sihir reinkarnasi memudar.');
        
        if (isPrefix) await response.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        else await context.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  }
};