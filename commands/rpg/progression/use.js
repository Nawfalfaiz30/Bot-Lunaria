const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));

module.exports = {
  name: 'use',
  aliases: ['pakai', 'makan', 'minum', 'u'],
  description: 'Mengonsumsi ramuan potion atau hasil panen makanan untuk memulihkan vitalitas atau mengaktifkan buff.',
  category: 'rpg/progression',

  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Mengonsumsi ramuan potion atau hasil panen pancing untuk memulihkan HP/Mana atau mengaktifkan buff.')
    .addStringOption(opt => opt.setName('item').setDescription('Nama lengkap item consumable yang ingin digunakan (Contoh: Small HP Potion)').setRequired(true))
    // 🌟 PERBAIKAN 1: Mengubah jenis opsi menjadi String agar bisa menerima ketikan "1k", "2.5k", atau "all"
    .addStringOption(opt => opt.setName('amount').setDescription('Jumlah barang (bisa ketik angka murni, "1k", atau "all")').setRequired(false)),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    let inputStr = "";
    let amountStr = "1";

    // =================================================================
    // 🧠 SMART ARGUMENT PARSER (MENDUKUNG MULTI-WORD NAMA & NOTASI K/M/ALL)
    // =================================================================
    if (isPrefix) {
      if (!args || args.length === 0) {
        return context.reply({ content: '❌ Mohon masukkan nama item yang ingin dikonsumsi! Contoh: `use Carp 1k` atau `use Small HP Potion all`', ephemeral: true });
      }
      // Deteksi regex penentu nilai jumlah kuantitas di argumen paling belakang
      const lastArg = args[args.length - 1].toLowerCase();
      if (/^(all|\d+(?:\.\d+)?[kmb]?)$/.test(lastArg)) {
        amountStr = lastArg;
        args.pop(); // Keluarkan parameter jumlah dari susunan array nama barang
      }
      inputStr = args.join(' ').trim().toLowerCase();
    } else {
      inputStr = context.options.getString('item').trim().toLowerCase();
      amountStr = context.options.getString('amount')?.trim().toLowerCase() || "1";
    }

    if (!inputStr) {
      return context.reply({ content: '❌ Mohon masukkan nama item yang valid!', ephemeral: true });
    }

    // 1. REVERSE LOOKUP ENGINE: Cari ID Unik Berdasarkan Properti 'name'
    let itemId = null;
    let itemInfo = null;

    for (const [key, value] of Object.entries(itemsData)) {
      if (value.name && value.name.trim().toLowerCase() === inputStr) {
        itemId = key;
        itemInfo = value;
        break;
      }
    }

    if (!itemId || !itemInfo) {
      return context.reply({ 
        content: `❌ Barang konsumsi dengan nama **"${isPrefix ? args.join(' ') : context.options.getString('item')}"** tidak ditemukan di dalam kamus semesta Lunaria!`, 
        ephemeral: true 
      });
    }

    // 2. Ambil Dokumen Database Pemain
    const userRPG = await RPG.findOne({ userId });
    const userInv = await Inventory.findOne({ userId });

    if (!userRPG || !userInv) {
      return context.reply({ content: `❌ Kamu belum terdaftar! Ketik \`profile\` terlebih dahulu untuk membuat ID karakter.`, ephemeral: true });
    }

    // 3. Validasi Tipe Barang
    if (itemInfo.type !== 'consumable') {
      return context.reply({ content: `❌ Barang **${itemInfo.name}** bukan merupakan jenis barang konsumsi (Consumable) yang bisa dimakan atau diminum!`, ephemeral: true });
    }

    // 4. Validasi Keberadaan Barang di Tas Pemain
    const invIndex = userInv.items.findIndex(i => i.itemId === itemId);
    if (invIndex === -1 || userInv.items[invIndex].amount <= 0) {
      return context.reply({ content: `❌ Kamu tidak memiliki item **${itemInfo.name}** di dalam tas inventarismu!`, ephemeral: true });
    }

    // =================================================================
    // 🧮 QUANTITY CONVERTER ENGINE (SINKRON DENGAN FINANSIAL SISTEM)
    // =================================================================
    const ownedAmount = userInv.items[invIndex].amount;
    let amount = 1;

    if (amountStr === 'all') {
      amount = ownedAmount;
    } else {
      const match = amountStr.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
      if (match) {
        let num = parseFloat(match[1]);
        const unit = match[2];
        if (unit === 'k') num *= 1000;
        else if (unit === 'm') num *= 1000000;
        else if (unit === 'b') num *= 1000000000;
        amount = Math.floor(num);
      } else {
        amount = 1;
      }
    }

    if (amount <= 0) {
      return context.reply({ content: '❌ Jumlah item yang ingin dikonsumsi harus lebih dari 0!', ephemeral: true });
    }

    if (ownedAmount < amount) {
      return context.reply({ content: `❌ Stok **${itemInfo.name}** di dalam tas inventaris milikmu tidak mencukupi untuk dikonsumsi sebanyak \`${amount.toLocaleString('id-ID')}\`x!`, ephemeral: true });
    }

    // 5. Hitung Batas Maksimal HP & Mana Menggunakan Jantung Kalkulator Stat
    const currentLiveStats = calculateStats(userRPG);
    const maxHp = currentLiveStats.combatStats.maxHp;
    const maxMana = currentLiveStats.combatStats.maxMana;

    // Validasi Pemulihan Instant (Hanya dicek jika item tidak memberikan efek Buff)
    const baseHealHp = itemInfo.effects?.heal_hp || 0;
    const baseHealMana = itemInfo.effects?.heal_mana || 0;

    if (!itemInfo.buff) {
      if (baseHealHp > 0 && userRPG.hp >= maxHp && baseHealMana === 0) {
        return context.reply({ content: '❤️ Bar Kesehatan (HP) kamu sudah penuh! Tidak perlu membuang ramuan obat sia-sia.', ephemeral: true });
      }
      if (baseHealMana > 0 && userRPG.mana >= maxMana && baseHealHp === 0) {
        return context.reply({ content: '💧 Bar Mana kamu sudah penuh! Tidak perlu membuang ramuan energi sia-sia.', ephemeral: true });
      }
      if (userRPG.hp >= maxHp && userRPG.mana >= maxMana) {
        return context.reply({ content: '⚡ Seluruh kondisi vital (HP & Mana) kamu sudah berada di kapasitas maksimal!', ephemeral: true });
      }
    }

    // 6. EKSEKUSI PEMULIHAN VITALITAS FLAT
    const oldHp = userRPG.hp;
    const oldMana = userRPG.mana;

    const totalHealHp = baseHealHp * amount;
    const totalHealMana = baseHealMana * amount;

    if (baseHealHp > 0) userRPG.hp = Math.min(maxHp, userRPG.hp + totalHealHp);
    if (baseHealMana > 0) userRPG.mana = Math.min(maxMana, userRPG.mana + totalHealMana);

    const netHpRecovered = userRPG.hp - oldHp;
    const netManaRecovered = userRPG.mana - oldMana;

    // ==========================================
    // 🧪 EXTENSION ENGINE: SISTEM SUNTIKAN BUFF BERDURASI
    // ==========================================
    let buffLogString = "";
    if (itemInfo.buff) {
      const durationMs = (itemInfo.buff.duration || 60000) * amount; 
      const now = Date.now();

      if (!userRPG.buffs) userRPG.buffs = [];

      const existingBuffIndex = userRPG.buffs.findIndex(b => b.itemName === itemInfo.name);

      if (existingBuffIndex !== -1) {
        const oldExpire = userRPG.buffs[existingBuffIndex].expiresAt.getTime();
        const baseAnchor = oldExpire > now ? oldExpire : now;
        userRPG.buffs[existingBuffIndex].expiresAt = new Date(baseAnchor + durationMs);
        
        const totalMinutes = Math.ceil((userRPG.buffs[existingBuffIndex].expiresAt.getTime() - now) / 60000);
        buffLogString = `\n✨ **Efek Durasi Diperpanjang:** Durasi status efek **${itemInfo.name}** bertumpuk menjadi **${totalMinutes} menit** sisa.`;
      } else {
        userRPG.buffs.push({
          itemName: itemInfo.name,
          statTarget: itemInfo.buff.statTarget,
          value: itemInfo.buff.value,
          type: itemInfo.buff.type,
          duration: itemInfo.buff.duration || 60000,
          expiresAt: new Date(now + durationMs)
        });
        buffLogString = `\n✨ **Efek Status Aktif:** Memperoleh tambahan bonus stat \`+${itemInfo.buff.type === 'percent' ? (itemInfo.buff.value * 100) + '%' : itemInfo.buff.value}\` **${itemInfo.buff.statTarget.toUpperCase()}** selama **${Math.ceil(durationMs / 60000)} menit**.`;
      }
    }

    // 7. PROSES PENGURANGAN DAN PEMBERSIHAN TAS (SELF-CLEANING LOGIC)
    userInv.items[invIndex].amount -= amount;
    if (userInv.items[invIndex].amount === 0) {
      userInv.items.splice(invIndex, 1);
    }

    // Simpan seluruh modifikasi perubahan ke MongoDB secara kolektif
    await userRPG.save();
    await userInv.save();

    // ==========================================
    // PENYUSUNAN EMBED NOTIFIKASI
    // ==========================================
    let tierBonusString = '';
    if (itemInfo.tier >= 10 && itemId.includes('fish')) {
      tierBonusString = `\n✨ *Rasa masakan kuliner tier tinggi ini sangat lezat, menyegarkan jiwa petualangmu secara instan!*`;
    }

    const useEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`${itemInfo.emoji} Barang Berhasil Dikonsumsi`)
      .setDescription(
        `Kamu telah mengonsumsi **${amount.toLocaleString('id-ID')}x** **${itemInfo.name}** dari tas inventaris.${tierBonusString}\n` +
        `${buffLogString}\n` +
        `**📈 Hasil Pemulihan Vitalitas:**\n` +
        `❤️ HP: \`+${netHpRecovered}\` *(Kini: ${userRPG.hp} / ${maxHp})*\n` +
        `💧 Mana: \`+${netManaRecovered}\` *(Kini: ${userRPG.mana} / ${maxMana})*`
      )
      .setTimestamp();

    return context.reply({ embeds: [useEmbed] });
  }
};