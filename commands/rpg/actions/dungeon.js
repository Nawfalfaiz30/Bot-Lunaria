const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { determineMonsterLoot } = require('../../../helpers/rngHelper');
const { processXPGain } = require('../../../helpers/rpgSystem');
const fs = require('fs');
const path = require('path');

// Memuat data semesta Isekai Lunaria
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/area.json'), 'utf8'));
const monstersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/monsters.json'), 'utf8'));

module.exports = {
  name: 'dungeon',
  aliases: ['d', 'boss', 'raid'],
  description: 'Menantang Bos Penjaga Gerbang area menggunakan mantera sihir aktif terkuat.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Menantang Bos Penjaga Gerbang area untuk membuka akses ke area berikutnya.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI: Cek status pendaftaran karakter
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      return context.reply({ 
        content: `❌ Jiwamu belum terpanggil di dunia ini! Ketik \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu untuk memulai reinkarnasi.`, 
        ephemeral: true 
      });
    }

    // 2. VALIDASI: Cek kewajiban memegang Senjata
    if (!userRPG.equipment.weapon) {
      return context.reply({ 
        content: `❌ Mustahil menantang Penguasa Dungeon dengan tangan kosong! Pasang senjatamu dari Guild dahulu via perintah \`equip [id_senjata]\`.`, 
        ephemeral: true 
      });
    }

    // 3. VALIDASI: Kalkulasi atribut pertempuran aktif
    const liveStats = calculateStats(userRPG);
    const playerCombat = liveStats.combatStats;
    const skill = liveStats.activeSkillInfo;
    
    // 4. VALIDASI: Cooldown Dungeon
    let cooldownDoc = await Cooldown.findOne({ userId });
    if (!cooldownDoc) {
      cooldownDoc = await Cooldown.create({ userId });
    }

    const cooldownDuration = 36000000; 
    const lastDungeon = cooldownDoc.dungeon ? cooldownDoc.dungeon.getTime() : 0;
    const elapsed = Date.now() - lastDungeon;

    if (elapsed < cooldownDuration) {
      const timeLeft = Math.ceil((cooldownDuration - elapsed) / 1000);
      const minutesLeft = Math.floor(timeLeft / 60);
      const secondsLeft = timeLeft % 60;
      return context.reply({ 
        content: `⏳ Gerbang Dungeon masih dikunci segel magis kuno. Tunggu **${minutesLeft}m ${secondsLeft}s** lagi sebelum energinya memudar kembali.`, 
        ephemeral: true 
      });
    }

    // INITIALISASI DATA BOS
    const currentAreaNumber = userRPG.current_area;
    const areaKey = `area_${currentAreaNumber}`;

    const areaMonstersData = monstersData[areaKey];
    const boss = areaMonstersData ? areaMonstersData.boss : null;

    if (!boss) {
      return context.reply({ content: '❌ Tidak ditemukan Bos Penjaga Labirin di wilayah ini.', ephemeral: true });
    }

    // ⚔️ ENGINE FIGHT
    let bossHp = boss.hp;
    let playerHpLoss = 0;
    let initialMana = userRPG.mana;
    let battleLog = [];
    let turn = 0;

    while (bossHp > 0 && (userRPG.hp - playerHpLoss) > 0) {
      turn++;
      let pDmg = 0;
      
      // Giliran Pemain
      if (skill && userRPG.mana >= skill.mana_cost && userRPG.active_skill.uses_left > 0) {
        pDmg = Math.max(10, skill.calculated_damage - boss.def); 
        bossHp -= pDmg;
        userRPG.mana -= skill.mana_cost; 
        userRPG.active_skill.uses_left--; 
        
        battleLog.push(`🔮 **Ronde ${turn}:** Merapalkan mantera agung **[${skill.name}]**! Menghasilkan \`${pDmg}\` DMG ke **${boss.name}**. *(Sisa HP Bos: ${bossHp > 0 ? bossHp : 0}/${boss.hp})*`);

        if (skill.buff_payload) {
          userRPG.buffs.push({
            itemName: skill.name,
            ...skill.buff_payload,
            expiresAt: new Date(Date.now() + skill.buff_payload.duration)
          });
        }
      } else {
        const isCrit = Math.random() * 100 <= playerCombat.critRate;
        pDmg = Math.max(10, playerCombat.atk - boss.def); 
        if (isCrit) pDmg = Math.round(pDmg * 1.5);
        
        bossHp -= pDmg;
        battleLog.push(`⚔️ **Ronde ${turn}:** Kamu menyerang **${boss.name}** sebesar \`${pDmg}\` DMG.${isCrit ? ' 🔥 **[TEBASAN VITAL!]**' : ''} *(Sisa HP Bos: ${bossHp > 0 ? bossHp : 0}/${boss.hp})*`);
      }

      if (bossHp <= 0) break;

      // Giliran Bos
      const isEvaded = Math.random() * 100 <= playerCombat.evasionRate;
      if (isEvaded) {
        battleLog.push(`💨 **Ronde ${turn}:** **${boss.name}** menyerang, tetapi kelincahan kakimu berhasil menghindar!`);
      } else {
        let mDmg = Math.max(5, boss.atk - playerCombat.def); 
        playerHpLoss += mDmg;
        battleLog.push(`💥 **Ronde ${turn}:** **${boss.name}** menghantam armor-mu, mengakibatkan \`-${mDmg}\` HP.`);
      }
    }

    // EVALUASI AKHIR
    const isPlayerVictory = bossHp <= 0 && (userRPG.hp - playerHpLoss) > 0;
    let totalManaUsed = initialMana - userRPG.mana;
    
    userRPG.hp = Math.max(0, userRPG.hp - playerHpLoss);
    userRPG.mana = Math.max(0, userRPG.mana);

    cooldownDoc.dungeon = new Date();
    await cooldownDoc.save();

    const weaponInfo = itemsData[userRPG.equipment.weapon];
    const dungeonEmbed = new EmbedBuilder().setTimestamp();
    const truncatedLog = battleLog.length > 12 ? `... *(pertukaran serangan pembuka terlewati)* ...\n` + battleLog.slice(-12).join('\n') : battleLog.join('\n');

    // Teks Ringkasan Evaluasi Pertempuran
    const combatStatsSummary = `📊 **Statistik Pertempuran:**\n` +
      `• Total Durasi: \`${turn}\` Ronde\n` +
      `• HP Berkurang: \`-${playerHpLoss}\` HP\n` +
      `• Mana Dikonsumsi: \`-${totalManaUsed}\` MP`;

    if (isPlayerVictory) {
      const rewards = determineMonsterLoot(boss.loot_table_id, liveStats);
      userRPG.gold += rewards.gold;
      
      let areaUnlockString = '';

      if (currentAreaNumber === 15) {
        userRPG.max_area = 15;
        if (!userRPG.refine) userRPG.refine = {};
        userRPG.refine.boss_15_cleared = true;
        userRPG.markModified('refine'); 

        areaUnlockString = `\n🏆 **PAHLAWAN PARIPURNA:** Kamu telah menaklukkan gerbang Dungeon terakhir di Puncak Yggdrasil! Segel menuju perintah \`incarnation\` kini telah terbuka sepenuhnya!`;
      } else {
        if (userRPG.max_area === currentAreaNumber) {
          userRPG.max_area += 1;
        }
        userRPG.current_area = currentAreaNumber + 1;
        areaUnlockString = `\n🔓 **GERBANG WILAYAH BARU TERBUKA:** Kamu otomatis dipindahkan ke **Area ${userRPG.current_area}**!`;
      }

      const xpResult = processXPGain(userRPG, rewards.xp);
      await userRPG.save();

      if (rewards.items && rewards.items.length > 0) {
        const userInv = await Inventory.findOne({ userId });
        rewards.items.forEach(dropItem => {
          const invItem = userInv.items.find(i => i.itemId === dropItem.itemId);
          if (invItem) invItem.amount += dropItem.amount;
          else userInv.items.push({ itemId: dropItem.itemId, amount: dropItem.amount });
        });
        await userInv.save();
      }

      dungeonEmbed.setColor('#2ECC71')
        .setTitle(`👑 Kemenangan Agung: Penguasa Labirin ${boss.name} Telah Tumbang!`)
        .setAuthor({ name: `Dungeon Conquest: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `Pertempuran menggunakan **${weaponInfo.name}** di dalam **Dungeon Area ${currentAreaNumber}**:\n\n` +
          `**📜 Jurnal Pertempuran:**\n${truncatedLog}\n\n` +
          `${combatStatsSummary}\n\n` +
          `🎁 **Rampasan Harta Karun Dungeon:**\n` +
          `📈 **Pengalaman:** +\`${rewards.xp}\` XP\n` +
          `💰 **Gold:** +\`${rewards.gold}\` Emas\n` +
          `📦 **Material:** ${rewards.items.length > 0 ? rewards.items.map(i => `${itemsData[i.itemId]?.emoji || '📦'} **${itemsData[i.itemId]?.name}** \`x${i.amount}\``).join(', ') : '*Tidak ada item*'}\n` +
          `${areaUnlockString}\n\n` +
          `❤️ **Kondisi Sisa:** \`${userRPG.hp} / ${playerCombat.maxHp}\` HP | 💧 \`${userRPG.mana} / ${playerCombat.maxMana}\` MP`
        );

      if (xpResult.leveledUp) {
        dungeonEmbed.addFields({ name: '🎉 LEVEL UP!', value: `Karaktermu kini berada di **Level ${xpResult.newLevel}**.` });
      }

    } else {
      await userRPG.save();
      dungeonEmbed.setColor('#E74C3C')
        .setTitle(`💀 Kamu Tumbang di Tangan ${boss.name}`)
        .setDescription(
          `**📜 Kronologi Kekalahan:**\n${truncatedLog}\n\n` +
          `${combatStatsSummary}\n\n` +
          `🚨 Kamu diselamatkan oleh berkah Dewi Pencipta kembali ke kota tanpa denda koin.`
        );
    }

    return context.reply({ embeds: [dungeonEmbed] });
  }
};