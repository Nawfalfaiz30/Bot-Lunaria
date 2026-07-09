/**
 * Lunaria RPG - Core Stat & Multiplier Calculator Engine
 * Berfungsi sebagai pengkalkulasi tunggal seluruh status karakter sebelum beraktivitas.
 */

const fs = require('fs');
const path = require('path');

const loadJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[StatCalculator Error] Gagal memuat file: ${filePath}`, error);
    return {};
  }
};

const classesData = loadJSON(path.join(__dirname, '../data/classes.json'));
const itemsData = loadJSON(path.join(__dirname, '../data/items.json'));
const passivesData = loadJSON(path.join(__dirname, '../data/passives.json'));

function calculateStats(rpgDoc) {
  if (!rpgDoc) {
    return {
      attributes: { str: 5, agi: 5, int: 5, vit: 5 },
      combatStats: { maxHp: 100, maxMana: 20, atk: 10, def: 5, critRate: 0, evasionRate: 0 },
      activeSkillInfo: null,
      passives: {},
      multipliers: { timetravelCount: 0, timetravelRawMultiplier: 1, xp: 1, gold: 1, loot: 1 }
    };
  }

  const level = rpgDoc.level || 1;
  const className = rpgDoc.class ? rpgDoc.class.toLowerCase() : null;
  const ttCount = rpgDoc.timetravel_count || 0;

  // =================================================================
  // FASE 1: AKUMULASI SELURUH ATRIBUT (STR, AGI, INT, VIT)
  // =================================================================
  let attributes = { str: 5, agi: 5, int: 5, vit: 5 };
  
  // A. Peningkatan Atribut Berdasarkan Level & Kelas Karakter
  if (className && classesData[className]) {
    const classInfo = classesData[className];
    attributes.str = (classInfo.base_attributes?.str || 5) + ((classInfo.growth_per_level?.str || 0) * (level - 1));
    attributes.agi = (classInfo.base_attributes?.agi || 5) + ((classInfo.growth_per_level?.agi || 0) * (level - 1));
    attributes.int = (classInfo.base_attributes?.int || 5) + ((classInfo.growth_per_level?.int || 0) * (level - 1));
    attributes.vit = (classInfo.base_attributes?.vit || 5) + ((classInfo.growth_per_level?.vit || 0) * (level - 1));
  } else {
    const noviceGrowth = level - 1;
    attributes.str += noviceGrowth * 1;
    attributes.agi += noviceGrowth * 1;
    attributes.int += noviceGrowth * 1;
    attributes.vit += noviceGrowth * 1;
  }

  // B. Tambahkan Bonus Atribut Permanen dari Hasil Memasak (Cook)
  if (rpgDoc.permanent_bonus) {
    attributes.str += rpgDoc.permanent_bonus.str || 0;
    attributes.agi += rpgDoc.permanent_bonus.agi || 0;
    attributes.int += rpgDoc.permanent_bonus.int || 0;
    attributes.vit += rpgDoc.permanent_bonus.vit || 0;
  }

  // C. Evaluasi Buff Atribut Sementara dari Alkimia (Alchemy Flat Buff)
  let needsSave = false;
  const now = Date.now();
  const validActiveBuffs = [];
  const tempFlatModifiers = { hp: 0, mana: 0, atk: 0, def: 0 };
  const tempPercentModifiers = { atk_pct: 0, def_pct: 0, xp_pct: 0 };

  if (rpgDoc.buffs && rpgDoc.buffs.length > 0) {
    rpgDoc.buffs.forEach(buff => {
      if (buff.expiresAt && buff.expiresAt.getTime() > now) {
        validActiveBuffs.push(buff);
        
        if (buff.type === 'flat') {
          if (attributes[buff.statTarget] !== undefined) {
            attributes[buff.statTarget] += buff.value; // Memasukkan flat buff ramuan ke core atribut
          } else if (tempFlatModifiers[buff.statTarget] !== undefined) {
            tempFlatModifiers[buff.statTarget] += buff.value;
          }
        } else if (buff.type === 'percent') {
          if (buff.statTarget === 'atk_pct') tempPercentModifiers.atk_pct += buff.value;
          if (buff.statTarget === 'def_pct') tempPercentModifiers.def_pct += buff.value;
          if (buff.statTarget === 'xp_pct') tempPercentModifiers.xp_pct += buff.value;
        }
      } else {
        needsSave = true; 
      }
    });
  }

  // 🌟 SOLUSI BUG: Membaca dan Menggabungkan Bonus Atribut Gear ke Core Atribut Terlebih Dahulu
  const activePassives = []; 
  const eqFlatModifiers = { hp: 0, mana: 0, atk: 0, def: 0 };

  if (rpgDoc.equipment) {
    for (const slot in rpgDoc.equipment) {
      const itemId = rpgDoc.equipment[slot];
      if (itemId && itemsData[itemId]) {
        const item = itemsData[itemId];
        
        if (item.stats) {
          // Suntikkan langsung ke core atribut agar memicu scaling di rumus konversi bawah
          if (item.stats.str) attributes.str += item.stats.str;
          if (item.stats.agi) attributes.agi += item.stats.agi;
          if (item.stats.int) attributes.int += item.stats.int;
          if (item.stats.vit) attributes.vit += item.stats.vit;

          // Pisahkan penampungan flat stat combat untuk dihitung setelah konversi atribut
          let currentAtk = item.stats.atk || 0;
          let currentDef = item.stats.def || 0;
          const refineLevel = (rpgDoc.refine && rpgDoc.refine[itemId]) ? (rpgDoc.refine[itemId] || 0) : 0;

          if (slot === 'weapon' && currentAtk > 0) {
            currentAtk += Math.round(currentAtk * (refineLevel * 0.10));
          }
          if (slot === 'armor' && currentDef > 0) {
            currentDef += Math.round(currentDef * (refineLevel * 0.10));
          }

          eqFlatModifiers.atk += currentAtk;
          eqFlatModifiers.def += currentDef;
          if (item.stats.hp) eqFlatModifiers.hp += item.stats.hp;
          if (item.stats.mana) eqFlatModifiers.mana += item.stats.mana;
        }
        if (item.passive_id) activePassives.push(item.passive_id);
      }
    }
  }

  // =================================================================
  // FASE 2: KONVERSI NILAI TOTAL ATRIBUT MENJADI STATUS TEMPUR UTAMA
  // =================================================================
  let maxHp = 100 + Math.round(attributes.vit * 12);
  let maxMana = 20 + Math.round(attributes.int * 5);
  let atk = Math.round(attributes.str * 1.5 + attributes.agi * 0.5);
  let def = Math.round(attributes.vit * 1.1);
  let critRate = attributes.agi * 0.2; 
  let evasionRate = attributes.agi * 0.1;

  // =================================================================
  // FASE 3: PENGGABUNGAN FLAT MODIFIERS (PERLENGKAPAN & RAMUAN)
  // =================================================================
  // Aplikasikan flat stat combat bawaan item dari Fase 1
  atk += eqFlatModifiers.atk;
  def += eqFlatModifiers.def;
  maxHp += eqFlatModifiers.hp;
  maxMana += eqFlatModifiers.mana;

  // Aplikasikan flat stat dari ramuan alkimia
  maxHp += tempFlatModifiers.hp;
  maxMana += tempFlatModifiers.mana;
  atk += tempFlatModifiers.atk;
  def += tempFlatModifiers.def;

  // Background Janitor: Sinkronisasi ulang batas HP & MP
  if (needsSave) {
    rpgDoc.buffs = validActiveBuffs;
    rpgDoc.hp = Math.min(maxHp, rpgDoc.hp);
    rpgDoc.mana = Math.min(maxMana, rpgDoc.mana);
    rpgDoc.save().catch(err => console.error("[Buff Janitor] Gagal membersihkan buff lama:", err));
  }

  // ==========================================
  // FASE 4: EFEK PASIF armor + MODIFIER PERCENT
  // ==========================================
  const modifiers = {
    atk_pct: tempPercentModifiers.atk_pct,
    def_pct: tempPercentModifiers.def_pct,
    xp_pct: tempPercentModifiers.xp_pct,
    fish_yield_pct: 0, fish_rare_pct: 0, fish_double_pct: 0,
    mine_yield_pct: 0, mine_rare_pct: 0, mine_double_yield: 0,
    chop_yield_pct: 0, chop_rare_chance: 0,
    hunt_loot_chance: 0, hunt_lifesteal: 0
  };

  activePassives.forEach(passiveId => {
    if (passivesData[passiveId]) {
      const effect = passivesData[passiveId];
      switch (effect.type) {
        case 'hunt_atk_percent': modifiers.atk_pct += effect.value; break;
        case 'def_percent': modifiers.def_pct += effect.value; break;
        case 'xp_gain_percent': modifiers.xp_pct += effect.value; break;
      }
    }
  });

  atk = Math.round(atk * (1 + modifiers.atk_pct));
  def = Math.round(def * (1 + modifiers.def_pct));

  // =================================================================
  // FASE 5: SKILL DAMAGE UPDATER
  // =================================================================
  let activeSkillInfo = null;
  if (rpgDoc.active_skill && rpgDoc.active_skill.id && rpgDoc.active_skill.uses_left > 0) {
    const classInfo = classesData[className];
    const skillData = classInfo?.skills?.find(s => s.id === rpgDoc.active_skill.id);
    
    if (skillData) {
      const scalingStatValue = attributes[skillData.scaling_stat] || 0;
      activeSkillInfo = {
        id: skillData.id,
        name: skillData.name,
        mana_cost: skillData.mana_cost,
        uses_left: rpgDoc.active_skill.uses_left,
        calculated_damage: Math.round(scalingStatValue * skillData.multiplier),
        buff_payload: skillData.buff_effect
      };
    }
  }

  const extraBonus = (50 * ttCount) + (0.5 * ttCount * ttCount);
  const timetravelMultiplier = 1 + (extraBonus / 100);

  return {
    attributes,
    combatStats: {
      maxHp: Math.max(10, maxHp),
      maxMana: Math.max(0, maxMana),
      atk: Math.max(1, atk),
      def: Math.max(0, def),
      critRate: Math.min(75, parseFloat(Math.max(0, critRate).toFixed(2))),
      evasionRate: Math.min(50, parseFloat(Math.max(0, evasionRate).toFixed(2)))
    },
    activeSkillInfo,
    passives: modifiers,
    multipliers: {
      timetravelCount: ttCount,

      // Contoh:
      // TT 1  -> 1.505x
      // TT 10 -> 6.50x
      // TT 37 -> 26.345x
      timetravelRawMultiplier: timetravelMultiplier,

      xp: (1 + modifiers.xp_pct) * 0.954 * timetravelMultiplier,
      gold: 0.7135 * timetravelMultiplier,
      loot: 0.30567 * timetravelMultiplier
    }
  };
}

module.exports = { calculateStats };