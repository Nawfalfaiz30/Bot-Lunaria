const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async (context) => {
    // 1. Bank Data Kuis (Diperluas menjadi 20 soal)
    const quizBank = [
        { q: "Apa nama galaksi tempat tata surya kita berada?", a: "Bimasakti", choices: ["Andromeda", "Bimasakti", "Triangulum", "Magellan"] },
        { q: "Planet mana yang dikenal sebagai planet merah?", a: "Mars", choices: ["Venus", "Mars", "Jupiter", "Merkurius"] },
        { q: "Dalam dunia RPG, apa kepanjangan dari INT?", a: "Intelligence", choices: ["Internal", "Intensity", "Intelligence", "Integrity"] },
        { q: "Siapa nama karakter utama di anime Naruto yang bercita-cita menjadi Hokage?", a: "Naruto Uzumaki", choices: ["Sasuke Uchiha", "Naruto Uzumaki", "Kakashi Hatake", "Shikamaru Nara"] },
        { q: "Apa nama game kotak-kotak di mana kamu bisa menambang dan membangun rumah?", a: "Minecraft", choices: ["Roblox", "Terraria", "Minecraft", "Fortnite"] },
        { q: "Hewan apa yang menjadi maskot resmi dari Studio Ghibli?", a: "Totoro", choices: ["Ponyo", "Catbus", "Totoro", "Calcifer"] },
        { q: "Gunung tertinggi di dunia adalah...", a: "Gunung Everest", choices: ["Gunung Kilimanjaro", "Gunung Fuji", "Gunung Everest", "Gunung Elbrus"] },
        { q: "Berapa jumlah kaki yang dimiliki oleh laba-laba?", a: "8", choices: ["6", "8", "10", "12"] },
        { q: "Di anime One Piece, buah iblis apa yang dimakan oleh Luffy?", a: "Gomu Gomu no Mi", choices: ["Mera Mera no Mi", "Gomu Gomu no Mi", "Ope Ope no Mi", "Bara Bara no Mi"] },
        { q: "Unsur kimia dengan simbol 'O' pada tabel periodik adalah...", a: "Oksigen", choices: ["Emas", "Osmium", "Oksigen", "Karbon"] },
        { q: "Pokemon kuning berbentuk tikus yang memiliki kekuatan listrik adalah?", a: "Pikachu", choices: ["Pichu", "Raichu", "Pikachu", "Jolteon"] },
        { q: "Ibu kota dari negara Jepang adalah...", a: "Tokyo", choices: ["Kyoto", "Osaka", "Tokyo", "Hokkaido"] },
        { q: "Siapa penemu bola lampu pijar yang sukses dikomersialkan?", a: "Thomas Edison", choices: ["Nikola Tesla", "Albert Einstein", "Thomas Edison", "Isaac Newton"] },
        { q: "Dalam game Mobile Legends, posisi pemain yang fokus di tengah peta disebut?", a: "Midlaner", choices: ["Jungler", "Goldlaner", "Midlaner", "Roamer"] },
        { q: "Planet terbesar di Tata Surya kita adalah...", a: "Jupiter", choices: ["Saturnus", "Matahari", "Neptunus", "Jupiter"] },
        { q: "Apa nama pedang hitam besar yang dibawa oleh Guts di anime Berserk?", a: "Dragon Slayer", choices: ["Excalibur", "Dragon Slayer", "Buster Sword", "Elucidator"] },
        { q: "Matahari terbit dari sebelah mana?", a: "Timur", choices: ["Barat", "Timur", "Utara", "Selatan"] },
        { q: "Berapa jumlah warna pada pelangi yang umum diketahui?", a: "7", choices: ["5", "6", "7", "8"] },
        { q: "Dalam anime Attack on Titan, apa nama dinding paling luar tempat Eren tinggal?", a: "Wall Maria", choices: ["Wall Rose", "Wall Sina", "Wall Maria", "Wall Titan"] },
        { q: "Konsol game PlayStation diproduksi oleh perusahaan apa?", a: "Sony", choices: ["Nintendo", "Microsoft", "Sony", "Sega"] }
    ];

    // 2. Pilih soal secara acak dan acak urutan jawabannya
    const selectedQuiz = quizBank[Math.floor(Math.random() * quizBank.length)];
    
    // Fungsi untuk mengacak posisi pilihan ganda agar jawaban benar tidak selalu di tempat yang sama
    const shuffledChoices = selectedQuiz.choices
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

    // 3. Buat Tombol Interaktif
    const row = new ActionRowBuilder();
    shuffledChoices.forEach((choice, index) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`trivia_${index}`)
                .setLabel(choice)
                .setStyle(ButtonStyle.Primary)
        );
    });

    const embed = new EmbedBuilder()
        .setTitle('🧩 Kuis Trivia Lunaria')
        .setDescription(`**Pertanyaan:**\n${selectedQuiz.q}\n\n*Waktu menjawab: 15 detik!*`)
        .setColor('#5865F2');

    // Identifikasi siapa yang memicu command
    const authorId = context.user ? context.user.id : context.author.id;
    const msg = await context.reply({ embeds: [embed], components: [row], fetchReply: true });

    // 4. Kolektor Tombol (Mencegah "Interaction Failed")
    const filter = i => i.customId.startsWith('trivia_') && i.user.id === authorId;
    const collector = context.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async i => {
        // INI ADALAH KUNCI FIX-NYA: Memberi tahu Discord bahwa tombol sukses ditekan
        await i.deferUpdate(); 
        
        const clickedIndex = parseInt(i.customId.split('_')[1]);
        const chosenAnswer = shuffledChoices[clickedIndex];
        const isCorrect = chosenAnswer === selectedQuiz.a;

        const resultEmbed = new EmbedBuilder()
            .setTitle(isCorrect ? '✅ Jawaban Benar!' : '❌ Jawaban Salah!')
            .setDescription(`Pertanyaan: ${selectedQuiz.q}\nJawaban yang benar adalah **${selectedQuiz.a}**.\n\nKamu menjawab: **${chosenAnswer}**`)
            .setColor(isCorrect ? '#57F287' : '#ED4245');

        // Matikan tombol setelah dijawab
        const disabledRow = new ActionRowBuilder();
        row.components.forEach(btn => {
            const disabledBtn = ButtonBuilder.from(btn).setDisabled(true);
            // Beri warna hijau pada tombol yang benar, dan merah jika jawaban user salah
            if (btn.data.label === selectedQuiz.a) {
                disabledBtn.setStyle(ButtonStyle.Success);
            } else if (btn.data.label === chosenAnswer && !isCorrect) {
                disabledBtn.setStyle(ButtonStyle.Danger);
            } else {
                disabledBtn.setStyle(ButtonStyle.Secondary);
            }
            disabledRow.addComponents(disabledBtn);
        });

        // Edit pesan dengan hasil dan tombol mati
        if (context.options) {
            await context.editReply({ embeds: [resultEmbed], components: [disabledRow] });
        } else {
            await msg.edit({ embeds: [resultEmbed], components: [disabledRow] });
        }
        
        collector.stop('answered');
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ Waktu Habis!')
                .setDescription(`Kamu terlalu lama berpikir!\nJawaban yang benar adalah **${selectedQuiz.a}**.`)
                .setColor('#4F545C');

            const disabledRow = new ActionRowBuilder();
            row.components.forEach(btn => {
                const disabledBtn = ButtonBuilder.from(btn).setDisabled(true).setStyle(ButtonStyle.Secondary);
                disabledRow.addComponents(disabledBtn);
            });

            if (context.options) {
                await context.editReply({ embeds: [timeoutEmbed], components: [disabledRow] });
            } else {
                await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] });
            }
        }
    });
};