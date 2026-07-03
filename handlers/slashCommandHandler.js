const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

module.exports = (client) => {
    let slashCount = 0;
    
    // Tempat menampung data JSON untuk kebutuhan pendaftaran API nantinya
    client.slashArray = []; 
    
    // Set memori lokal untuk mendeteksi nama perintah ganda saat bot dinyalakan
    const commandNames = new Set(); 

    const commandsPath = path.join(__dirname, '../commands');
    if (!fs.existsSync(commandsPath)) return;

    // FUNGSI REKURSIF: Membaca file tanpa batasan kedalaman struktur folder
    const readSlashCommands = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Jika menemukan folder baru, gali masuk ke dalam
                readSlashCommands(filePath);
            } else if (file.endsWith('.js')) {
                const command = require(filePath);
                
                // Memastikan file memiliki kerangka data dan fungsi eksekusi slash command
                if (command.data && command.execute) {
                    const cmdName = command.data.name;
                    
                    // PROTEKSI DUPLIKAT INTERNAL BOT
                    if (commandNames.has(cmdName)) {
                        logger.error(`[DUPLIKAT] Nama perintah /${cmdName} di file '${file}' sudah digunakan oleh file lain!`);
                        continue;
                    }
                    
                    commandNames.add(cmdName);
                    client.slashCommands.set(cmdName, command);
                    client.slashArray.push(command.data.toJSON());
                    slashCount++;
                }
            }
        }
    };

    readSlashCommands(commandsPath);
    logger.success(`Berhasil memuat ${slashCount} Slash Commands ke dalam memori Client.`);
};