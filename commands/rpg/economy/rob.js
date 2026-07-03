const { SlashCommandBuilder } = require('discord.js');
const RpgDB = require('../../../models/rpgSchema');
const embed = require('../../../helpers/embed');

module.exports = {
    name: 'rpgrob',
    aliases: ['rob', 'rampok'],
    data: new SlashCommandBuilder()
        .setName('rpgrob')
        .setDescription('Mencoba merampok Gold dari dompet pemain lain.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pemain malang yang ingin kamu rampok')
                .setRequired(true)
        ),

    async execute(context, args, client) {
        const isInteraction = context.options !== undefined;
        const userExecutor = isInteraction ? context.user : context.author;

        const sendResponse = async (options) => {
            if (!isInteraction) delete options.ephemeral;
            return await context.reply(options);
        };

        // Tentukan Target Korban (Mendukung ID dan Mention)
        let targetUser;
        if (isInteraction) {
            targetUser = context.options.getUser('target');
        } else {
            targetUser = context.mentions.users.first() || 
                         (args && args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        }

        // Proteksi input kosong pada mode prefix
        if (!targetUser) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Gagal Perintah', 'Kamu harus menentukan user target yang ingin dirampok!\nContoh: `!rpgrob @user` atau `!rpgrob [ID_User]`')],
                ephemeral: true
            });
        }

        if (targetUser.bot || targetUser.id === userExecutor.id) {
            return sendResponse({ content: 'Tidak bisa merampok bot atau diri sendiri.', ephemeral: true });
        }

        const robber = await RpgDB.findOne({ userId: userExecutor.id });
        const victim = await RpgDB.findOne({ userId: targetUser.id });

        if (!robber) return sendResponse({ content: 'Kamu belum terdaftar di RPG.', ephemeral: true });
        if (!victim) return sendResponse({ content: 'Target belum terdaftar di RPG.', ephemeral: true });

        // Cooldown System (1 Jam)
        const cooldownTime = 60 * 60 * 1000; 
        if (robber.lastRob && (Date.now() - robber.lastRob.getTime() < cooldownTime)) {
            const timeLeft = Math.ceil((cooldownTime - (Date.now() - robber.lastRob.getTime())) / 60000);
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Sedang Bersembunyi!', `Polisi masih mencarimu! Tunggu **${timeLeft} menit** lagi sebelum merampok kembali.`)], 
                ephemeral: true 
            });
        }

        if ((victim.gold || 0) < 50) {
            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Terlalu Miskin', 'Target terlalu miskin untuk dirampok (Di bawah 50 Gold). Cari mangsa lain yang lebih kaya!')], 
                ephemeral: true 
            });
        }

        robber.lastRob = new Date();

        // Probabilitas: 40% Sukses, 60% Gagal
        const isSuccess = Math.random() < 0.40;
        const percentage = Math.floor(Math.random() * (30 - 10 + 1) + 10) / 100;
        const amount = Math.floor(victim.gold * percentage);

        if (isSuccess) {
            victim.gold -= amount;
            robber.gold += amount;
            
            await robber.save();
            await victim.save();

            return sendResponse({ 
                embeds: [embed.success(userExecutor, 'Perampokan Sukses! 🥷', `Kamu mengendap-endap dan berhasil merampas **${amount}** 🪙 dari dompet <@${targetUser.id}>!`)] 
            });
        } else {
            const fine = Math.min(amount, robber.gold || 0);
            robber.gold -= fine;
            victim.gold += fine;

            await robber.save();
            await victim.save();

            return sendResponse({ 
                embeds: [embed.error(userExecutor, 'Ketahuan! 🚨', `Kamu tertangkap basah oleh <@${targetUser.id}> saat mencoba merampok!\nSebagai hukuman, kamu harus membayar ganti rugi sebesar **${fine}** 🪙 kepada mereka.`)] 
            });
        }
    }
};