const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const Cooldown = require('../../../models/cooldownSchema');
const { calculateStats } = require('../../../helpers/statCalculator');
const { determineMonsterLoot } = require('../../../helpers/rngHelper');
const { processXPGain } = require('../../../helpers/rpgSystem');
const fs = require('fs');
const path = require('path');

// Memuat data semesta Lunaria
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/area.json'), 'utf8'));
const monstersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/monsters.json'), 'utf8'));

module.exports = {
  name: 'hunt',
  aliases: ['h', 'berburu', 'fight'],
  description: 'Berburu monster di area saat ini menggunakan kombinasi muatan skill aktif terpusat.',
  category: 'rpg/actions',

  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Berburu monster di area saat ini untuk menaikkan level dan menggunakan skill aktif.'),

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

    // 2. VALIDASI: Cek kewajiban memegang Senjata (Weapon)
    if (!userRPG.equipment.weapon) {
      return context.reply({ 
        content: `❌ Kamu tidak bisa berburu monster dengan tangan kosong! Beli senjata di \`shop\` dan pasang dengan perintah \`equip [id_senjata]\`.`, 
        ephemeral: true 
      });
    }

    // 3. VALIDASI: Cek ambang batas HP minimal untuk bertarung
    if (userRPG.hp <= 15) {
      return context.reply({ 
        content: `❤️ Kondisi HP-mu terlalu kritis (\`${userRPG.hp}\` HP) untuk bertarung! Pulihkan dirimu dengan ketik \`use potion_hp_small\` terlebih dahulu.`, 
        ephemeral: true 
      });
    }

    // 4. VALIDASI: Sistem Anti-Spam Cooldown Berburu (Durasi: 45 Detik)
    const cooldownDoc = await Cooldown.findOne({ userId });
    const cooldownDuration = 45000; 
    const elapsed = Date.now() - cooldownDoc.hunt.getTime();

    if (elapsed < cooldownDuration) {
      const timeLeft = Math.ceil((cooldownDuration - elapsed) / 1000);
      return context.reply({ 
        content: `⏳ Waspada! Monster-monster sedang bersembunyi. Tunggu **${timeLeft} detik** untuk mencari jejak baru.`, 
        ephemeral: true 
      });
    }

    // =================================================================
    // 👾 INITIALISASI DATA MONSTER BERDASARKAN AREA
    // =================================================================
    const currentAreaNumber = userRPG.current_area;
    const areaKey = `area_${currentAreaNumber}`;
    const currentAreaInfo = areaData[areaKey];

    const areaMonstersData = monstersData[areaKey];
    let monster = null;

    if (areaMonstersData && areaMonstersData.monsters && areaMonstersData.monsters.length > 0) {
      const randomIndex = Math.floor(Math.random() * areaMonstersData.monsters.length);
      monster = areaMonstersData.monsters[randomIndex];
    }

    if (!monster) {
      return context.reply({ content: '❌ Wilayah ini terdeteksi aman, tidak ada monster yang bisa diburu di area ini.', ephemeral: true });
    }

    // 5. KALKULASI SIMULASI PERTEMPURAN (COMBAT ENGINE)
    const liveStats = calculateStats(userRPG);
    const playerCombat = liveStats.combatStats;
    const skill = liveStats.activeSkillInfo; 

    let monsterHp = monster.hp;
    let playerHpLoss = 0;
    let battleLog = [];
    let turn = 0;

    while (monsterHp > 0 && (userRPG.hp - playerHpLoss) > 0) {
      turn++;
      let pDmg = 0;
      
      // A. Giliran Pemain Menyerang Monster
      if (skill && userRPG.mana >= skill.mana_cost && userRPG.active_skill.uses_left > 0) {
        pDmg = Math.max(5, skill.calculated_damage - monster.def); 
        monsterHp -= pDmg;
        
        userRPG.mana -= skill.mana_cost; 
        userRPG.active_skill.uses_left--; 
        
        battleLog.push(`🔮 **Ronde ${turn}:** Melepaskan jurus **[${skill.name}]**! Menghasilkan \`${pDmg}\` DMG. *(Sisa Kuota: ${userRPG.active_skill.uses_left}x)*`);

        if (skill.buff_payload) {
          userRPG.buffs.push({
            itemName: skill.name,
            ...skill.buff_payload,
            expiresAt: new Date(Date.now() + skill.buff_payload.duration)
          });
        }
      } else {
        const isCrit = Math.random() * 100 <= playerCombat.critRate;
        pDmg = Math.max(5, playerCombat.atk - monster.def); 
        
        if (isCrit) {
          pDmg = Math.round(pDmg * 1.5);
        }
        
        monsterHp -= pDmg;
        battleLog.push(`⚔️ **Ronde ${turn}:** Kamu menyerang **${monster.name}** sebesar \`${pDmg}\` DMG.${isCrit ? ' 💥 **CRITICAL!**' : ''} *(Sisa HP Monster: ${monsterHp > 0 ? monsterHp : 0})*`);
      }

      if (monsterHp <= 0) break;

      // B. Giliran Monster Menyerang Balik Pemain
      const isEvaded = Math.random() * 100 <= playerCombat.evasionRate;
      if (isEvaded) {
        battleLog.push(`💨 **Ronde ${turn}:** **${monster.name}** mencoba menerkam, namun kamu berhasil melesat menghindar! \`[EVADE]\``);
      } else {
        let mDmg = Math.max(1, monster.atk - playerCombat.def); 
        playerHpLoss += mDmg;
        battleLog.push(`💥 **Ronde ${turn}:** **${monster.name}** mencakar tubuhmu, mengakibatkan \`-${mDmg}\` HP.`);
      }
    }

    // ==========================================
    // PENENTUAN AKHIR EVALUASI PERTEMPURAN
    // ==========================================
    const isPlayerVictory = monsterHp <= 0 && (userRPG.hp - playerHpLoss) > 0;
    
    userRPG.hp = Math.max(0, userRPG.hp - playerHpLoss);
    userRPG.mana = Math.max(0, userRPG.mana); 

    cooldownDoc.hunt = new Date();
    await cooldownDoc.save();

    const weaponInfo = itemsData[userRPG.equipment.weapon];
    const huntEmbed = new EmbedBuilder().setTimestamp();

    const truncatedLog = battleLog.length > 12 ? `... *(beberapa ronde pembuka terlewati)* ...\n` + battleLog.slice(-12).join('\n') : battleLog.join('\n');

    if (isPlayerVictory) {
      const rewards = determineMonsterLoot(monster.loot_table_id, liveStats);
      
      userRPG.gold += rewards.gold;
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

      huntEmbed.setColor('#2ECC71')
        .setTitle(`⚔️ Kemenangan Mutlak atas ${monster.name}`)
        .setAuthor({ name: `${user.username} menjelajahi semak belukar...`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `Menggunakan ${weaponInfo.emoji} **${weaponInfo.name}** di wilayah **${currentAreaInfo?.emoji || '🧭'} ${currentAreaInfo?.name || `Area ${currentAreaNumber}`}**:\n\n` +
          `**📜 Ringkasan Aksi:**\n${truncatedLog}\n\n` +
          `🎁 **Hadiah Rampasan Perang:**\n` +
          `📈 **Pengalaman:** +\`${rewards.xp}\` XP\n` +
          `💰 **Koin Emas:** +\`${rewards.gold}\` Emas\n` +
          `📦 **Item Drop:** ${rewards.items.length > 0 ? rewards.items.map(i => `${itemsData[i.itemId]?.emoji || '📦'} **${itemsData[i.itemId]?.name}** \`x${i.amount}\``).join(', ') : '*Tidak ada item jatuh*'}\n\n` +
          `❤️ **Sisa Kondisi Vital:** \`${userRPG.hp} / ${playerCombat.maxHp}\` HP | 💧 \`${userRPG.mana} / ${playerCombat.maxMana}\` MP`
        );

      if (xpResult.leveledUp) {
        huntEmbed.addFields({ 
          name: '🎉 LEVEL UP!', 
          value: `Kekuatan jiwamu meledak! Kamu naik menjadi **Level ${xpResult.newLevel}**.` 
        });
      }

    } else {
      // 🌟 PERBAIKAN: Logika pemotongan denda 10% emas dihapus total
      await userRPG.save();

      huntEmbed.setColor('#E74C3C')
        .setTitle(`💀 Kamu Terkapar Dikalahkan oleh ${monster.name}`)
        .setAuthor({ name: `${user.username} disergap dari belakang!`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `**📜 Kronologi Kekalahan:**\n${truncatedLog}\n\n` +
          `🚨 **Status Evaluasi Darurat:**\n` +
          `Darahmu telah habis! Kamu pingsan di medan tempur dan dievakuasi kembali ke kota dengan selamat.\n\n` +
          `💡 *Gunakan perintah \`skills\` untuk memuat mantera aktif karakter sebelum menantang balik monster area ini!*`
        );
    }

    return context.reply({ embeds: [huntEmbed] });
  }
};