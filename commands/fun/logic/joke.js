const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    const jokes = [
    "Kenapa ban mobil warnanya hitam? Kalau kuning, namanya tahu sumedang.", // 1
    "Hewan apa yang kalau lagi flu parah disukai anak-anak? Gajah... karena Gajah-bersin.", // 2
    "Kenapa superman poni rambutnya ikal? Karena kalau lurus namanya supermie.", // 3
    "Dewa apa yang suka kesepian? Dewasa sendirian tanpa kekasih.", // 4
    "Buah apa yang paling ditakuti sama mahasiswa? Belimbing... karena belimbingan skripsi.", // 5
    "Sayur apa yang kalau dinyanyin jadi lagu romantis? Kol... Kol me maybe.", // 6
    "Hewan apa yang paling patuh pada peraturan lalu lintas? Unta... Untamakan keselamatan.", // 7
    "Kenapa pohon kelapa di depan rumah harus ditebang? Soalnya kalau dicabut berat.", // 8
    "Gajah apa yang belalainya pendek? Gajah pesek.", // 9
    "Kipas apa yang ditunggu-tunggu sama cewek? Kipas-tian untuk dilamar.", // 10
    "Kucing apa yang kuno dan purba? Kucinggalan zaman.", // 11
    "Makanan apa yang kalau dimakan bikin kita jadi salting? Tahu... Tahu-tahu dia udah ada yang punya.", // 12
    "Kenapa sepiring nasi goreng bisa hilang? Karena di-piring.", // 13
    "Hewan apa yang tidak pernah fokus kalau belajar? Lalat... karena lalat pikiran (lelah pikiran).", // 14
    "Negara apa yang mayoritas warganya suka minjem uang? Iran... Iran uang kas, Iran bulanan.", // 15
    "Hantu apa yang paling pintar hitung-hitungan? Matematikuntilanak.", // 16
    "Kenapa nyamuk bunyinya nguing-nguing di telinga? Karena kalau bunyinya prok-prok, mereka mati digeprek.", // 17
    "Hewan apa yang paling tidak punya sopan santun? Kutu... Kutu rambut dibiarin, kutu kasur meloncat-loncat.", // 18
    "Piring apa yang paling ditakuti sama cowok? Piring-atan dari pacar kalau belum bales chat.", // 19
    "Kenapa matahari tenggelam setiap sore? Karena kalau siang dia udah capek jemur baju manusia." // 20
];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];

    const embed = new EmbedBuilder()
        .setTitle('🤣 Kamus Humor Lunaria')
        .setDescription(joke)
        .setColor('#FEE75C');

    await interaction.reply({ embeds: [embed] });
};