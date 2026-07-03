const { SlashCommandBuilder } = require('discord.js');
const shipLogic = require('./logic/ship');
const triviaLogic = require('./logic/trivia');
const rpsLogic = require('./logic/rps');
const tictactoeLogic = require('./logic/tictactoe');
const snakeLogic = require('./logic/snake');
const eightBallLogic = require('./logic/eightball');
const jokeLogic = require('./logic/joke');

module.exports = {
    name: 'fun',
    aliases: ['hiburan'],
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('Pusat hiburan dan minigames kasual Lunaria')
        .addSubcommand(sub =>
            sub.setName('ship')
                .setDescription('Cek persentase kecocokan cinta antara dua pengguna')
                .addUserOption(opt => opt.setName('user1').setDescription('Pengguna pertama').setRequired(true))
                .addUserOption(opt => opt.setName('user2').setDescription('Pengguna kedua (opsional)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('trivia')
                .setDescription('Main kuis trivia untuk menguji pengetahuanmu')
        )
        .addSubcommand(sub =>
            sub.setName('rps')
                .setDescription('Bermain Batu-Gunting-Kertas melawan bot')
                .addStringOption(opt =>
                    opt.setName('pilihan')
                        .setDescription('Pilih senjatamu!')
                        .setRequired(true)
                        .addChoices(
                            { name: '✊ Batu', value: 'batu' },
                            { name: '🖐️ Kertas', value: 'kertas' },
                            { name: '✌️ Gunting', value: 'gunting' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('tictactoe')
                .setDescription('Tantang pengguna lain bermain Tic-Tac-Toe')
                .addUserOption(opt => opt.setName('lawan').setDescription('Pilih lawan mainmu').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('snake')
                .setDescription('Bermain game ular klasik di Discord')
        )
        .addSubcommand(sub =>
            sub.setName('8ball')
                .setDescription('Ajukan pertanyaan pada bola ramalan 8-Ball')
                .addStringOption(opt => opt.setName('pertanyaan').setDescription('Apa yang ingin kamu tanyakan?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('joke')
                .setDescription('Dengarkan lelucon bapak-bapak/lucu untuk mencairkan suasana')
        ),

    async execute(context, args, client) {
        // 1. Deteksi jenis subcommand (Slash vs Prefix)
        let sub = '';

        if (context.options) {
            // Jalur Slash Command
            sub = context.options.getSubcommand();
        } else {
            // Jalur Prefix chat biasa
            if (!args || args.length === 0) {
                return context.reply({ 
                    content: '❌ Silakan tentukan menu fun! Contoh: `ln fun joke`, `ln fun trivia`, `ln fun ship`, dll.' 
                });
            }
            sub = args[0].toLowerCase();
        }

        // 2. Eksekusi logika modul
        switch (sub) {
            case 'ship': await shipLogic(context); break;
            case 'trivia': await triviaLogic(context); break;
            case 'rps': await rpsLogic(context); break;
            case 'tictactoe': await tictactoeLogic(context); break;
            case 'snake': await snakeLogic(context); break;
            case '8ball': await eightBallLogic(context); break;
            case 'joke': await jokeLogic(context); break;
            default:
                if (context.options) {
                    await context.reply({ content: 'Fitur tidak ditemukan!', ephemeral: true });
                } else {
                    await context.reply({ content: '❌ Fitur tidak ditemukan! Ketik perintah dengan benar.' });
                }
        }
    }
};