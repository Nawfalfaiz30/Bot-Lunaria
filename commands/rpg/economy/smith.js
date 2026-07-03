const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RPG = require('../../../models/rpgSchema');
const Inventory = require('../../../models/inventorySchema');
const fs = require('fs');
const path = require('path');

const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/items.json'), 'utf8'));
const recipesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/recipes.json'), 'utf8'));

module.exports = {
  name: 'smith',
  aliases: ['tempa', 'forge'],
  description: 'Menempa meningkatkan status peralatan aktif dengan jaminan keberhasilan mutlak 100%.',
  category: 'rpg/economy',

  data: new SlashCommandBuilder()
    .setName('smith')
    .setDescription('Menempa meningkatkan status peralatan aktif dengan jaminan keberhasilan mutlak 100%.')
    .addStringOption(opt => 
      opt.setName('slot')
         .setDescription('Pilih kategori perlengkapan yang ingin ditempa')
         .setRequired(true)
         .addChoices(
           { name: '⚔️ Senjata (Weapon)', value: 'weapon' },
           { name: '🛡️ armor Pelindung (Armor)', value: 'armor' }
         )
    ),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    let slot = 'weapon';
    if (isPrefix) {
      const input = args[0]?.toLowerCase();
      if (input === 'armor' || input === 'armor') slot = 'armor';
    } else {
      slot = context.options.getString('slot');
    }

    const userRPG = await RPG.findOne({ userId });
    const userInv = await Inventory.findOne({ userId });
    if (!userRPG || !userInv) return context.reply({ content: '❌ Akun karakter tidak ditemukan.', ephemeral: true });

    const equippedItemId = userRPG.equipment[slot];
    if (!equippedItemId || !itemsData[equippedItemId]) {
      return context.reply({ content: `❌ Kamu tidak bisa menempa karena tidak ada peralatan yang terpasang di slot **${slot.toUpperCase()}**!`, ephemeral: true });
    }

    const itemInfo = itemsData[equippedItemId];
    if (!userRPG.refine) userRPG.refine = {};
    
    const currentLevel = userRPG.refine[equippedItemId] || 0;

    // Batas Hard Cap Upgrade Lunaria Engine
    if (currentLevel >= 15) {
      return context.reply({ content: `❌ Perkakas **${itemInfo.name}** milikmu sudah mencapai batas kekuatan penempaan tertinggi Dewa (\`+15\`)!`, ephemeral: true });
    }

    // Penarikan cetak biru resep kustom dari recipes.json
    const smithRecipes = recipesData.smith || {};
    const recipe = smithRecipes[equippedItemId] || { material_id: 'copper_ore', gold_multiplier: 1.0, ore_multiplier: 1.0 };
    
    const oreId = recipe.material_id;
    const oreInfo = itemsData[oreId];

    // 📈 SCALING FORMULA: Biaya meningkat kuadratis seiring tingkatan level smith
    const goldCost = Math.round((12000 * Math.pow(currentLevel + 1, 2)) * recipe.gold_multiplier);
    const oreCost = Math.round((3 * (currentLevel + 1)) * recipe.ore_multiplier);

    // Validasi tabungan koin emas
    if (userRPG.gold < goldCost) {
      return context.reply({ content: `❌ Tabungan tidak cukup! Menempa **${itemInfo.name}** ke tingkat \`+${currentLevel + 1}\` membutuhkan 💰 \`${goldCost.toLocaleString('id-ID')}\` Gold.`, ephemeral: true });
    }

    // Validasi ketersediaan mineral/drop material di tas
    const invOreIndex = userInv.items.findIndex(i => i.itemId === oreId);
    if (invOreIndex === -1 || userInv.items[invOreIndex].amount < oreCost) {
      const owned = invOreIndex === -1 ? 0 : userInv.items[invOreIndex].amount;
      return context.reply({ content: `❌ Bahan material tidak mencukupi! Membutuhkan ${oreInfo?.emoji || '📦'} **${oreInfo?.name || oreId}** sebanyak \`${oreCost}\`x (Kamu hanya memiliki \`${owned}\`x).`, ephemeral: true });
    }

    // =================================================================
    // ⚔️ MUTASI TRANSAKSI: 100% GARANSI KEBERHASILAN (NO RNG ROLL)
    // =================================================================
    userRPG.gold -= goldCost;
    userInv.items[invOreIndex].amount -= oreCost;
    if (userInv.items[invOreIndex].amount === 0) userInv.items.splice(invOreIndex, 1);

    // Kenaikan level otomatis tanpa hambatan
    userRPG.refine[equippedItemId] = currentLevel + 1;

    // Beritahu Mongoose bahwa objek tipe Mixed mengalami modifikasi internal
    userRPG.markModified('refine');
    
    await userRPG.save();
    await userInv.save();

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🔥 [PANDAI BESI: PENEMPAAN BERHASIL MUTLAK]')
      .setAuthor({ name: `Toko Besi Kerajaan Lunaria`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `Denting hantaman palu pandai besi menyatukan serat logam perkakas dengan sempurna tanpa cela!\n\n` +
        `🔨 **Peralatan:** ${itemInfo.emoji} **${itemInfo.name}**\n` +
        `📈 **Evolusi Kekuatan:** \`+${currentLevel}\` ➔ ✨ **\`+${userRPG.refine[equippedItemId]}\`** ✨\n` +
        `📊 **Bonus Stat Atribut:** Efek murni dasar item meningkat menjadi **+${userRPG.refine[equippedItemId] * 10}%**!\n\n` +
        `💸 **Alokasi Sumber Daya:**\n` +
        `└ ✨ Bersih Mengonsumsi: \`${oreCost}\`x ${oreInfo?.name || oreId} & 💰 \`${goldCost.toLocaleString('id-ID')}\` Gold.`
      )
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  }
};