// Contoh potongan kode setup di file panel.js Anda untuk mengirim tombol ke channel target
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Pemicu Ticket Panel
const ticketEmbed = new EmbedBuilder()
    .setTitle('🎫 PUSAT BANTUAN SERVER')
    .setDescription('Butuh bantuan staf pengurus server atau ingin mengajukan report aduan? Tekan tombol di bawah ini untuk membuka tiket obrolan pribadi!')
    .setColor('#3498db');

const ticketRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_create').setLabel('📩 Buka Tiket Bantuan').setStyle(ButtonStyle.Primary)
);

// Pemicu Confess Panel
const confessEmbed = new EmbedBuilder()
    .setTitle('🤫 LUNARIA CONFESSION ROOM')
    .setDescription('Ingin mengungkapkan isi hati, kekaguman rahasia, atau curhatan secara anonim tanpa diketahui siapapun? Klik tombol di bawah sekarang!')
    .setColor('#ff79c6');

const confessRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confess_create').setLabel('💌 Tulis Confess').setStyle(ButtonStyle.Success)
);