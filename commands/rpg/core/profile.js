const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { getXPNeededForLevel } = require('../../../helpers/rpgSystem');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/area.json'), 'utf8'));

module.exports = {
  name: 'profile',
  aliases: ['p', 'rpgprofile', 'rpgp'],
  description: 'Menampilkan profil karakter Lunaria dengan kompresi mata uang fantasi tingkat tinggi.',
  category: 'rpg/core',

  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Menampilkan profil karakter Lunaria-mu.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    let userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      userRPG = new RPG({ userId });
      await userRPG.save();
      await new Inventory({ userId, items: [] }).save();
      await new Cooldown({ userId }).save();
    }

    const liveStats = calculateStats(userRPG);
    const xpNeeded = getXPNeededForLevel(userRPG.level);

    const areaKey = `area_${userRPG.current_area}`;
    const currentAreaInfo = areaData[areaKey];
    const areaName = currentAreaInfo ? currentAreaInfo.name : 'Unknown Region';
    const areaEmoji = currentAreaInfo ? currentAreaInfo.emoji : '🧭';

    // =================================================================
    // 🔮 KUNCI AMAN: BIGINT CURRENCY SPLITTER ENGINE (ANTI-LAG & COMPRESS)
    // =================================================================
    let totalGoldBigInt;
    try {
      totalGoldBigInt = BigInt(userRPG.gold);
    } catch (e) {
      totalGoldBigInt = 0n;
    }

    const ONE_TRILLION = 1000000000000n; 
    const premiumCount = totalGoldBigInt / ONE_TRILLION; 
    const displayGold = totalGoldBigInt % ONE_TRILLION;  

    let premiumFormatStr = "";
    if (premiumCount >= 1000000000n) {
      premiumFormatStr = Number(premiumCount).toExponential(2); 
    } else {
      premiumFormatStr = Number(premiumCount).toLocaleString('id-ID'); 
    }

    let currencyText = `• **Gold:** 💰 \`${Number(displayGold).toLocaleString('id-ID')}\``;
    if (premiumCount > 0n) {
      currencyText += `\n• **Aurum Gold:** 🪙 \`${premiumFormatStr}\` T`;
    }

    const profileEmbed = new EmbedBuilder()
      .setColor('#7289DA')
      .setAuthor({ name: `Profil RPG: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`⚔️ Petualang Lunaria`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(`────────────────────────────────────────`)
      .setTimestamp();

    // =================================================================
    // 🛠️ PERBAIKAN ENGINE: DYNAMIC SMITH LEVEL EXTRACTION
    // =================================================================
    const getEquipmentString = (slotId) => {
      const gearId = userRPG.equipment[slotId];
      if (gearId && itemsData[gearId]) {
        // Ambil data live level tempa berdasarkan ID Item spesifik dari database
        const refineLevel = userRPG.refine && userRPG.refine[gearId] ? userRPG.refine[gearId] : 0;
        // Jika level lebih dari 0, sisipkan teks visual tambahan (contoh: +5)
        const refineString = refineLevel > 0 ? ` \`+${refineLevel}\`` : '';
        
        return `${itemsData[gearId].emoji} **${itemsData[gearId].name}**${refineString}`;
      }
      return '❌ *Kosong*';
    };

    const skillText = liveStats.activeSkillInfo 
      ? `🔥 **[ ${liveStats.activeSkillInfo.name} ]**\n└─ Sisa Kuota: \`${liveStats.activeSkillInfo.uses_left}\` Kali Serangan`
      : '📭 *Belum ada mantra yang dimuat*';

    profileEmbed.addFields(
      { 
        name: '📜 Informasi Dasar', 
        value: `• **Kelas:** ${userRPG.class ? `🛡️ ${userRPG.class}` : 'Novice *(Pilih via /classes)*'}\n` +
               `• **Level:** \`${userRPG.level}\`\n` +
               `• **XP:** \`${userRPG.xp.toLocaleString('id-ID')} / ${xpNeeded.toLocaleString('id-ID')}\` XP\n` +
               currencyText, 
        inline: true 
      },
      { 
        name: '🗺️ Progresi Dunia', 
        value: `• **Area Saat Ini:** ${areaEmoji} \`Area ${userRPG.current_area}: ${areaName}\`\n` +
               `• **Batas Maksimal:** 🔓 \`Area ${userRPG.max_area}\`\n` +
               `• **Inkarnasi:** ⏳ \`${userRPG.timetravel_count}\` X`, 
        inline: true 
      },
      {
        name: '🩸 Kondisi Vital',
        value: `• **HP:** ❤️ \`${userRPG.hp.toLocaleString('id-ID')} / ${liveStats.combatStats.maxHp.toLocaleString('id-ID')}\`\n` +
               `• **Mana:** 💧 \`${userRPG.mana.toLocaleString('id-ID')} / ${liveStats.combatStats.maxMana.toLocaleString('id-ID')}\`\n` +
               `────────────────────────────────────────`, 
        inline: false
      },
      {
        name: '🔮 Muatan Mantera Pertempuran',
        value: `${skillText}\n` +
               `────────────────────────────────────────`, 
        inline: false
      },
      {
        name: '🛡️ Perlengkapan Tempur',
        value: `• **Senjata:** \n${getEquipmentString('weapon')}\n` +
               `• **armor Pelindung:** \n${getEquipmentString('armor')}`,
        inline: true
      },
      {
        name: '🛠️ Peralatan Kerja (Tools)',
        value: `• **Alat Pancing:** \n${getEquipmentString('fishing_rod')}\n` +
               `• **Beliung Tambang:** \n${getEquipmentString('pickaxe')}\n` +
               `• **Kapak Penebang:** \n${getEquipmentString('axe')}`,
        inline: true
      }
    );

    return context.reply({ embeds: [profileEmbed] });
  }
};