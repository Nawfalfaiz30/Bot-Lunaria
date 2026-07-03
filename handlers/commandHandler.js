const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

module.exports = (client) => {
    let commandsCount = 0;
    let aliasesCount = 0;

    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        logger.warn("Folder 'commands' tidak ditemukan. Mengabaikan pemuatan Prefix Command.");
        return;
    }

    const readCommands = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                readCommands(filePath);
            } else if (file.endsWith('.js')) {
                try {
                    const command = require(filePath);
                    
                    // Validasi: Harus memiliki 'name' dan 'execute' (untuk Prefix)
                    // Kita juga mendukung 'data.name' jika itu Hybrid Slash Command
                    const commandName = command.name || command.data?.name;
                    
                    if (commandName && command.execute) {
                        // Daftarkan ke Collection utama
                        client.commands.set(commandName, command);
                        commandsCount++;
                        
                        // Daftarkan Aliases (jika ada)
                        // Daftarkan Aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            // Kita menyimpan "nama command" (string) ke dalam alias
                            client.aliases.set(alias, command.name); 
                        });
                    }
                    }
                } catch (error) {
                    logger.error(`Gagal memuat command dari file: ${file}`, error);
                }
            }
        }
    };

    readCommands(commandsPath);
    logger.success(`Berhasil memuat ${commandsCount} Commands & ${aliasesCount} Aliases.`);
};