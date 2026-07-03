const { SlashCommandBuilder } = require('discord.js');
const wordleLogic = require('./logic/wordle');
const hangmanLogic = require('./logic/hangman');
const minesweeperLogic = require('./logic/minesweeper');

module.exports = {
    name: 'game',
    aliases: ['g', 'games'],
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Pusat bermain game seru di Lunaria')
        .addSubcommand(subcmd =>
            subcmd.setName('wordle')
                .setDescription('Tebak 5 huruf kata tersembunyi dalam 6 kesempatan')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('hangman')
                .setDescription('Selamatkan om Hangman dengan menebak kata yang benar')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('minesweeper')
                .setDescription('Bersihkan papan dari bom tersembunyi')
        ),

    async execute(context, args, client) {
        // 1. Deteksi jenis subcommand (Slash vs Prefix)
        let subcommand = '';
        
        if (context.options) {
            // Jika dipicu lewat Slash Command
            subcommand = context.options.getSubcommand();
        } else {
            // Jika dipicu lewat Prefix biasa (misal: ln game hangman -> args[0] adalah 'hangman')
            if (!args || args.length === 0) {
                return context.reply({ 
                    content: '❌ Silakan tentukan game yang ingin dimainkan! Contoh: `ln game hangman`, `ln game wordle`, atau `ln game minesweeper`.' 
                });
            }
            subcommand = args[0].toLowerCase();
        }

        // 2. Arahkan ke file logika masing-masing
        switch (subcommand) {
            case 'wordle':
                await wordleLogic(context);
                break;
            case 'hangman':
                await hangmanLogic(context);
                break;
            case 'minesweeper':
                await minesweeperLogic(context);
                break;
            default:
                if (context.options) {
                    await context.reply({ content: 'Game tidak ditemukan!', ephemeral: true });
                } else {
                    await context.reply({ content: '❌ Game tidak ditemukan! Pilih antara: `wordle`, `hangman`, atau `minesweeper`.' });
                }
        }
    }
};