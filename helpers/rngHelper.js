/**
 * Lunaria RPG - RNG & Loot Drop Engine
 * Mengatur probabilitas drop item, perhitungan bonus pasif, dan multiplier kuantitas.
 */

const fs = require('fs');
const path = require('path');

// Memuat data statis untuk referensi item dan loot table
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/items.json'), 'utf8'));
const lootTables = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/lootTables.json'), 'utf8'));
const areaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/area.json'), 'utf8'));

/**
 * Menghasilkan angka acak di antara nilai minimum dan maksimum (inklusif).
 */
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Menghitung drop dari monster berdasarkan Loot Table dan status kalkulasi pemain.
 * * @param {string} lootTableId - ID loot table dari monsters.json
 * @param {Object} calculatedStats - Hasil utuh dari statCalculator.js
 * @returns {Object} Hasil drop berupa xp, gold, dan array of items didapat
 */
function determineMonsterLoot(lootTableId, calculatedStats) {
  const table = lootTables[lootTableId];
  
  // Jika loot table tidak ditemukan, berikan fallback kosong
  if (!table) {
    return { xp: 10, gold: 5, items: [] };
  }

  const { multipliers, passives } = calculatedStats;

  // 1. Kalkulasi XP & Gold dengan Multiplier Timetravel + Pasif
  const baseXp = randomRange(table.xp_min, table.xp_max);
  const baseGold = randomRange(table.gold_min, table.gold_max);

  const finalXp = Math.round(baseXp * multipliers.xp);
  const finalGold = Math.round(baseGold * multipliers.gold);

  // 2. Kalkulasi Drop Item
  const rolledItems = [];

  if (table.drops && table.drops.length > 0) {
    table.drops.forEach(drop => {
      // Modifikasi peluang drop dasar dengan pasif (contoh: +15% chance dari Treasure Hunter)
      const bonusChance = passives.hunt_loot_pct || 0;
      const finalChance = drop.chance * (1 + bonusChance);

      // Lempar dadu RNG (0.00 hingga 1.00)
      if (Math.random() <= finalChance) {
        const baseAmount = randomRange(drop.min, drop.max);
        
        // Kuantitas drop dikalikan dengan multiplier loot Timetravel (minimal 1)
        const finalAmount = Math.max(1, Math.round(baseAmount * multipliers.loot));

        rolledItems.push({
          itemId: drop.item_id,
          amount: finalAmount
        });
      }
    });
  }

  return {
    xp: finalXp,
    gold: finalGold,
    items: rolledItems
  };
}

/**
 * Menghitung hasil panen aktivitas gathering (fish, mine, chop) per area.
 * * @param {string} activityType - Jenis aktivitas ('fish', 'mine', 'chop')
 * @param {number} areaNumber - Angka area saat ini (1-15)
 * @param {Object} calculatedStats - Hasil utuh dari statCalculator.js
 * @returns {Object} Hasil panen berupa itemId dasar, jumlah, dan status keberuntungan
 */
function determineGatheringLoot(activityType, areaNumber, calculatedStats) {
  const areaKey = `area_${areaNumber}`;
  const area = areaData[areaKey];
  
  if (!area || !area.gathering_available[activityType]) {
    return null;
  }

  const baseItemId = area.gathering_available[activityType];
  const { multipliers, passives } = calculatedStats;

  // 1. Tentukan Kuantitas Dasar & Bonus Yield dari Pasif Alat Kerja
  let yieldBonus = 0;
  let doubleChance = 0;
  let rareChance = 0;

  if (activityType === 'fish') {
    yieldBonus = passives.fish_yield_pct || 0;
    doubleChance = passives.fish_double_pct || 0;
    rareChance = passives.fish_rare_pct || 0;
  } else if (activityType === 'mine') {
    yieldBonus = passives.mine_yield_pct || 0;
    doubleChance = passives.mine_double_pct || 0;
    rareChance = passives.mine_rare_pct || 0;
  } else if (activityType === 'chop') {
    yieldBonus = passives.chop_yield_pct || 0;
    rareChance = passives.chop_rare_pct || 0;
    // Khusus chop, mythic passive memberikan peluang hemat energi (bisa diolah di berkas command)
  }

  // Jumlah panen dasar (1-3) dikali bonus yield alat + multiplier Timetravel
  let baseAmount = randomRange(1, 3);
  let finalAmount = Math.round(baseAmount * (1 + yieldBonus) * multipliers.loot);
  finalAmount = Math.max(1, finalAmount);

  // Mekanik Double Catch / Yield (Peluang dapat x2 lipat dari total akhir)
  let isDouble = false;
  if (Math.random() <= doubleChance) {
    finalAmount *= 2;
    isDouble = true;
  }

  // 2. Mekanik Item Langka (Rare Drop)
  // 5% peluang dasar dasar + dimodifikasi oleh rareChance dari Epic/Mythic Tools
  let finalItemId = baseItemId;
  let isRare = false;
  const baseRareRoll = 0.05; 

  if (Math.random() <= (baseRareRoll * (1 + rareChance))) {
    // Jika beruntung, item diubah menjadi versi tier tinggi (misal: oak_wood -> pine_wood / item khusus)
    // Untuk kesederhanaan, kita beri tanda pengenal khusus atau bonus kuantitas melimpah
    finalAmount += randomRange(2, 4);
    isRare = true;
  }

  // 3. Kalkulasi XP Aktivitas (Rare memberikan XP lebih melimpah sesuai spesifikasi)
  let baseActivityXp = isRare ? randomRange(40, 70) : randomRange(15, 30);
  // Kalikan dengan level area agar area tinggi memberikan XP lebih rasional
  baseActivityXp = baseActivityXp * (1 + (areaNumber * 0.15));
  const finalXp = Math.round(baseActivityXp * multipliers.xp);

  return {
    itemId: finalItemId,
    amount: finalAmount,
    xp: finalXp,
    gold: randomRange(5, 15) * areaNumber, // Sedikit bonus emas komersial
    isRare,
    isDouble
  };
}

module.exports = {
  determineMonsterLoot,
  determineGatheringLoot
};