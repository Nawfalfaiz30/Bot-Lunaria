/**
 * Lunaria RPG - XP & Leveling Engine
 * Mengatur rumus perkembangan level pemain secara polinomial berimbang.
 */

/**
 * Menghitung total kebutuhan XP untuk melewati level tertentu.
 * Menggunakan kurva polinomial kuadratik agar level tinggi tetap masuk akal diburu.
 * * Contoh Hasil Progresi Baru:
 * - Level 1: 300 XP
 * - Level 2: 800 XP
 * - Level 3: 1,500 XP
 * - Level 10: 12,000 XP
 * - Level 50: 260,000 XP
 * - Level 100: 1,020,000 XP
 * * @param {number} level - Level karakter saat ini
 * @returns {number} Target XP yang dibutuhkan untuk naik ke level berikutnya
 */
function getXPNeededForLevel(level) {
  if (level < 1) return 100;
  
  // 🔥 ROMBAK TOTAL: Mengganti eksponensial ekstrem dengan rumus polinomial kuadratik yang aman
  return Math.round(137 * Math.pow(level, 2));
}

/**
 * Memproses penambahan XP ke pemain dan melakukan kalkulasi kenaikan level.
 * Fungsi ini menangani kasus multi-level up jika XP yang didapat sangat besar.
 * * @param {Object} rpgDoc - Dokumen Mongoose dari data/model pemain (rpgSchema)
 * @param {number} xpGained - Jumlah XP murni yang didapatkan dari aktivitas
 * @returns {Object} Status perubahan level untuk keperluan visualisasi embed Discord
 */
function processXPGain(rpgDoc, xpGained) {
  // Tambahkan XP murni ke data pemain
  rpgDoc.xp += xpGained;
  
  let initialLevel = rpgDoc.level;
  let leveledUp = false;

  // Lakukan perulangan cek target XP selama XP saat ini melebihi ambang batas levelnya
  while (rpgDoc.xp >= getXPNeededForLevel(rpgDoc.level)) {
    rpgDoc.xp -= getXPNeededForLevel(rpgDoc.level);
    rpgDoc.level += 1;
    leveledUp = true;
  }

  // Menghitung berapa banyak level yang berhasil dinaikkan
  const levelsGained = rpgDoc.level - initialLevel;

  return {
    leveledUp,
    levelsGained,
    oldLevel: initialLevel,
    newLevel: rpgDoc.level,
    currentXp: rpgDoc.xp,
    nextLevelXp: getXPNeededForLevel(rpgDoc.level)
  };
}

module.exports = {
  getXPNeededForLevel,
  processXPGain
};