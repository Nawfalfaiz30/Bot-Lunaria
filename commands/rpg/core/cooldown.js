const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Cooldown = require('../../../models/cooldownSchema'); //[cite: 15]

module.exports = {
  name: 'cooldown',
  aliases: ['cd', 'status_waktu'],
  description: 'Memeriksa sisa waktu tunggu (cooldown) ritual dan aktivitas karakter.',
  category: 'rpg/core',

  data: new SlashCommandBuilder()
    .setName('cooldown')
    .setDescription('Memeriksa sisa waktu tunggu (cooldown) ritual dan aktivitas karakter.'),

  async execute(context, args, client) {
    const isPrefix = !!context.author;
    const user = isPrefix ? context.author : context.user;
    const userId = user.id;

    // 1. Ambil dokumen cooldown user dari database
    let cooldownDoc = await Cooldown.findOne({ userId });
    if (!cooldownDoc) {
      cooldownDoc = new Cooldown({ userId });
      await cooldownDoc.save();
    }

    const now = Date.now();

    // =================================================================
    // ⚙️ CONFIGURATION ENGINE: DURASI WAKTU TUNGGU SETIAP AKTIVITAS
    // =================================================================
    // Menyelaraskan dengan durasi di berkas hunt.js (45s) & dungeon.js (5m)
    const cooldownDurations = {
      hunt: 45000,        // 45 Detik
      dungeon: 300000,    // 5 Menit
      fish: 180000,       // 3 Menit (Sesuaikan dengan berkas fish.js milikmu)
      mine: 180000,       // 3 Menit (Sesuaikan dengan berkas mine.js milikmu)
      chop: 180000,       // 3 Menit (Sesuaikan dengan berkas chop.js milikmu)
      daily: 86400000,    // 24 Jam[cite: 15]
      weekly: 604800000   // 7 Hari[cite: 15]
    };

    // Pemetaan nama display dan emoji estetika untuk antarmuka Discord
    const activityMeta = {
      hunt: { name: '⚔️ Subjugation (Hunt)', type: 'battle' },
      dungeon: { name: '👑 Labyrinth Gate (Dungeon)', type: 'battle' },
      fish: { name: '🌊 Aquamancy (Fish)', type: 'gather' },
      mine: { name: '💎 Geomancy (Mine)', type: 'gather' },
      chop: { name: '🌿 Commute Forest (Chop)', type: 'gather' },
      daily: { name: '📜 Berkat Harian (Daily)', type: 'ritual' },
      weekly: { name: '🔮 Ritual Mingguan (Weekly)', type: 'ritual' }
    };

    // Wadah penampung baris baris string status UI
    let categories = { battle: [], gather: [], ritual: [] };

    // =================================================================
    // 🎲 TIME PARSING ENGINE: HITUNG MUNDUR SISA MILIDETIK
    // =================================================================
    for (const [activity, duration] of Object.entries(cooldownDurations)) {
      const lastExecuted = cooldownDoc[activity];
      const meta = activityMeta[activity];
      
      let isReady = true;
      let remainingText = '`✅ Ready to Cast`';

      if (lastExecuted) {
        const elapsed = now - lastExecuted.getTime();
        if (elapsed < duration) {
          isReady = false;
          const timeLeftMs = duration - elapsed;

          // Konversi matematis milidetik ke bentuk Jam, Menit, Detik
          const totalSeconds = Math.ceil(timeLeftMs / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          // Penyusunan teks format waktu agar dinamis (menghilangkan 0h atau 0m)
          let timeString = '';
          if (hours > 0) timeString += `${hours}j `;
          if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
          timeString += `${seconds}s`;

          remainingText = `\`⏳ ${timeString}\``;
        }
      }

      // Kelompokkan baris ke dalam kategori field embed masing-masing
      categories[meta.type].push(`**${meta.name}**\n└─ ${remainingText}`);
    }

    // ==========================================
    // RENDER VISUAL EMBED SYSTEM UI
    // ==========================================
    const cdEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setAuthor({ name: `Status Lini Masa Sihir: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('⏳ Manifes Cooldown Karakter')
      .setDescription(
        `Berikut adalah kesiapan energi mantera dan ritme fisik tubuhmu saat ini di semesta Lunaria.\n` +
        `────────────────────────────────────────`
      )
      .addFields(
        { 
          name: '🔮 Komando Ritual Sakral', 
          value: categories.ritual.join('\n'), 
          inline: false 
        },
        { 
          name: '⚔️ Misi Tempur & Eksorsisme', 
          value: categories.battle.join('\n'), 
          inline: false 
        },
        { 
          name: '🧪 Ekstraksi Elemen Sampingan', 
          value: categories.gather.join('\n'), 
          inline: false 
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Gunakan energi sihirmu segera setelah status berubah menjadi Ready!' });

    return context.reply({ embeds: [cdEmbed] });
  }
};