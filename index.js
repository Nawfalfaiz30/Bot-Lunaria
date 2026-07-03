require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    Events
} = require('discord.js');

const mongoose = require('mongoose');
const logger = require('./helpers/logger');

// =======================
// Music Configuration (Official Stable Plugins)
// =======================
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');

// =======================
// Discord Client Configuration
// =======================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions // Memastikan bot menangkap data reaksi masuk
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// =======================
// Collections
// =======================
client.commands = new Collection();
client.slashCommands = new Collection();
client.aliases = new Collection();

// =======================
// DisTube Initialization
// =======================
client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
        new YtDlpPlugin({
            update: true 
        })
    ]
});

logger.success('[SISTEM] DisTube Music Helper berhasil diinisialisasi.');

// =======================
// Load Handlers (Core Modules)
// =======================
require('./handlers/commandHandler')(client);
require('./handlers/slashCommandHandler')(client);
require('./handlers/eventHandler')(client);

// =======================
// Ready Event Guard & Automation Trigger
// =======================
client.once(Events.ClientReady, (readyClient) => {
    logger.success(`[ONLINE] Login sukses sebagai ${readyClient.user.tag}!`);
    
    try {
        require('./handlers/cronHandler')(readyClient);
    } catch (cronError) {
        logger.error('[HANDLER ERROR] Gagal mengaktifkan modul cronHandler:', cronError);
    }
});

// =======================
// MongoDB Connection & Login
// =======================
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        logger.success('Berhasil terhubung ke MongoDB Database.');
        try {
            const tokenBot = process.env.DISCORD_TOKEN || process.env.TOKEN;
            await client.login(tokenBot);
        } catch (err) {
            logger.error('Gagal login ke Discord. Periksa DISCORD_TOKEN / TOKEN di file .env.', err);
        }
    })
    .catch(err => {
        logger.error('KONEKSI DATABASE GAGAL. Bot dihentikan.', err);
        process.exit(1);
    });

// =======================
// Anti Crash System (Uptime Guard)
// =======================
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection terdeteksi:', reason);
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception terdeteksi:', err);
});
process.on('uncaughtExceptionMonitor', (err) => {
    logger.error('Uncaught Exception Monitor terdeteksi:', err);
});