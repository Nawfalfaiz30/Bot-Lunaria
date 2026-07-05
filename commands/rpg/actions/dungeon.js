const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { determineMonsterLoot } = require('../../../helpers/rngHelper');
const { processXPGain } = require('../../../helpers/rpgSystem');
const fs = require('fs');
const path = require('path');

// Memuat data semesta Lunaria[cite: 12]
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/area.json'), 'utf8'));
const monstersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/monsters.json'), 'utf8'));

module.exports = {
  name: 'dungeon',
  aliases: ['d', 'boss', 'raid'],
  description: 'Menantang Bos Penjaga Gerbang area menggunakan muatan skill aktif terpusat.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Menantang Bos Penjaga Gerbang area untuk membuka akses ke area berikutnya.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. VALIDASI: Cek pendaftaran karakter[cite: 12]
    const userRPG = await RPG.findOne({ userId });
    if (!userRPG) {
      return context.reply({ 
        content: `❌ Kamu belum terdaftar! Ketik \`${isPrefix ? 'profile' : '/profile'}\` terlebih dahulu.`, 
        ephemeral: true 
      });
    }

    // 2. VALIDASI: Cek kewajiban memegang Senjata (Weapon)[cite: 12]
    if (!userRPG.equipment.weapon) {
      return context.reply({ 
        content: `❌ Mustahil menantang Penguasa Dungeon dengan tangan kosong! Pasang senjatamu dahulu via perintah \`equip [id_senjata]\`.`, 
        ephemeral: true 
      });
    }

    // 3. VALIDASI: Cek ambang batas HP minimal[cite: 12]
    const liveStats = calculateStats(userRPG);
    const playerCombat = liveStats.combatStats;
    const skill = liveStats.activeSkillInfo;
    
    // 4. VALIDASI: Sistem Anti-Spam Cooldown Dungeon (Durasi: 5 Menit)
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
        content: `⏳ Gerbang Dungeon masih terkunci segel magis. Tunggu **${minutesLeft}m ${secondsLeft}s** lagi sebelum segelnya terbuka kembali.`, 
        ephemeral: true 
      });
    }
    // ==========================================
    // INITIALISASI DATA BOS BERDASARKAN AREA[cite: 12]
    // ==========================================
    const currentAreaNumber = userRPG.current_area;
    const areaKey = `area_${currentAreaNumber}`;

    const areaMonstersData = monstersData[areaKey];
    const boss = areaMonstersData ? areaMonstersData.boss : null;

    if (!boss) {
      return context.reply({ content: '❌ Tidak ditemukan Bos Penjaga di area ini.', ephemeral: true });
    }

    // ==========================================
    // ⚔️ ENGINES BOS FIGHT (NO ROUND LIMITS)[cite: 12]
    // ==========================================
    let bossHp = boss.hp;
    let playerHpLoss = 0;
    let battleLog = [];
    let turn = 0;

    while (bossHp > 0 && (userRPG.hp - playerHpLoss) > 0) {
      turn++;
      let pDmg = 0;
      
      // A. Giliran Pemain Menyerang Bos[cite: 12]
      if (skill && userRPG.mana >= skill.mana_cost && userRPG.active_skill.uses_left > 0) {
        pDmg = Math.max(10, skill.calculated_damage - boss.def); 
        bossHp -= pDmg;
        
        userRPG.mana -= skill.mana_cost; 
        userRPG.active_skill.uses_left--; 
        
        battleLog.push(`🔮 **Ronde ${turn}:** Melepaskan jurus **[${skill.name}]**! Menghasilkan \`${pDmg}\` DMG ke **${boss.name}**. *(Kuota Sisa: ${userRPG.active_skill.uses_left}x)*`);

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
        battleLog.push(`⚔️ **Ronde ${turn}:** Kamu menyerang **${boss.name}** sebesar \`${pDmg}\` DMG.${isCrit ? ' 🔥 **[CRITICAL!]**' : ''} *(Sisa HP Bos: ${bossHp > 0 ? bossHp : 0}/${boss.hp})*`);
      }

      if (bossHp <= 0) break;

      // B. Giliran Bos Menyerang Balik Pemain[cite: 12]
      const isEvaded = Math.random() * 100 <= playerCombat.evasionRate;
      if (isEvaded) {
        battleLog.push(`💨 **Ronde ${turn}:** **${boss.name}** meluncurkan serangan mematikan, tetapi kamu berhasil berguling menghindar!`);
      } else {
        let mDmg = Math.max(5, boss.atk - playerCombat.def); 
        playerHpLoss += mDmg;
        battleLog.push(`💥 **Ronde ${turn}:** **${boss.name}** mengamuk dan menghantammu, mengakibatkan \`-${mDmg}\` HP.`);
      }
    }

    // ==========================================
    // PENENTUAN EVALUASI & PROGRESI DATABASE[cite: 12]
    // ==========================================
    const isPlayerVictory = bossHp <= 0 && (userRPG.hp - playerHpLoss) > 0;
    
    userRPG.hp = Math.max(0, userRPG.hp - playerHpLoss);
    userRPG.mana = Math.max(0, userRPG.mana);

    cooldownDoc.dungeon = new Date();
    await cooldownDoc.save();

    const weaponInfo = itemsData[userRPG.equipment.weapon];
    const dungeonEmbed = new EmbedBuilder().setTimestamp();

    const truncatedLog = battleLog.length > 12 ? `... *(beberapa ronde pembuka terlewati)* ...\n` + battleLog.slice(-12).join('\n') : battleLog.join('\n');

    if (isPlayerVictory) {
      const rewards = determineMonsterLoot(boss.loot_table_id, liveStats);
      userRPG.gold += rewards.gold;
      
      // 🌟 PERBAIKAN UTAMANYA: Katup Pengaman Kunci Maksimal Area 15 Terpasang Sempurna
      let areaUnlockString = '';
      if (userRPG.max_area === userRPG.current_area) {
        if (userRPG.max_area < 15) {
          userRPG.max_area += 1;
          areaUnlockString = `\n🔓 **GERBANG DUNIA BARU TERBUKA:** Kamu berhasil membuka **Area ${userRPG.max_area}**! Gunakan perintah \`move ${userRPG.max_area}\` untuk berpindah wilayah petualangan.`;
        } else {
          areaUnlockString = `\n🏆 **PETUALANG PARIPURNA:** Kamu telah menaklukkan gerbang Dungeon terakhir dan menghentikan kutukan distorsi waktu di semesta Lunaria!`;
        }
      }

      // Pengaman global ekstra sebelum disimpan ke cloud MongoDB
      userRPG.max_area = Math.min(15, userRPG.max_area);

      const xpResult = processXPGain(userRPG, rewards.xp);
      await userRPG.save();

      if (rewards.items && rewards.items.length > 0) {
        const userInv = await Inventory.findOne({ userId });
        rewards.items.forEach(dropItem => {
          const invItem = userInv.items.find(i => i.itemId === dropItem.itemId);
          if (invItem) {
            invItem.amount += dropItem.amount;
          } else {
            userInv.items.push({ itemId: dropItem.itemId, amount: dropItem.amount });
          }
        });
        await userInv.save();
      }

      dungeonEmbed.setColor('#2ECC71')
        .setTitle(`👑 Kemenangan Legendaris: ${boss.name} Telah Tumbang!`)
        .setAuthor({ name: `Dungeon Clearing Match: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `Pertempuran hidup mati menggunakan **${weaponInfo.name}** di jantung **Dungeon Area ${currentAreaNumber}**:\n\n` +
          `**📜 Jurnal Pertempuran:**\n${truncatedLog}\n\n` +
          `🎁 **Rampasan armor & Harta Karun Dungeon:**\n` +
          `📈 **Pengalaman Suci:** +\`${rewards.xp}\` XP\n` +
          `💰 **Gold Diperoleh:** +\`${rewards.gold}\` Emas\n` +
          `📦 **Artefak Drop:** ${rewards.items.length > 0 ? rewards.items.map(i => `${itemsData[i.itemId]?.emoji || '📦'} **${itemsData[i.itemId]?.name}** \`x${i.amount}\``).join(', ') : '*Tidak ada item jatuh*'}\n` +
          `${areaUnlockString}\n\n` +
          `❤️ **Kondisi Pasca Pertempuran:** \`${userRPG.hp} / ${playerCombat.maxHp}\` HP | 💧 \`${userRPG.mana} / ${playerCombat.maxMana}\` MP`
        );

      if (xpResult.leveledUp) {
        dungeonEmbed.addFields({ 
          name: '🎉 LEVEL UP!', 
          value: `Kekuatan jiwamu melompat tajam! Karaktermu kini berada di **Level ${xpResult.newLevel}**.` 
        });
      }

    } else {
      await userRPG.save();

      dungeonEmbed.setColor('#E74C3C')
        .setTitle(`💀 Kamu Tumbang Dihancurkan oleh ${boss.name}`)
        .setAuthor({ name: `Dungeon Wipeout: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `**📜 Kronologi Kekalahan Tragis:**\n${truncatedLog}\n\n` +
          `🚨 **Laporan Tim Medis Istana:**\n` +
          `Kamu babak belur dihajar Bos Penjaga. Beruntung, berkah pelindung dewi malam aktif melindungi tabungan dompetmu dari denda rumah sakit!\n\n` +
          `💡 *Saran: Pastikan kuota mantramu terisi penuh melalui perintah \`skills\` sebelum memasuki gerbang dungeon kembali!*`
        );
    }

    return context.reply({ embeds: [dungeonEmbed] });
  }
};