require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandNames = new Set(); 
const foldersPath = path.join(__dirname, 'commands');

// FUNGSI REKURSIF UTAMA
const readCommandsRecursively = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            readCommandsRecursively(filePath);
        } else if (file.endsWith('.js')) {
            // Clear cache agar data yang dibaca selalu paling baru saat di-deploy ulang
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if (command.data && command.execute) {
                const cmdName = command.data.name;
                
                if (commandNames.has(cmdName)) {
                    console.log(`🚨 DUPLIKAT: File '${file}' memakai nama '/${cmdName}' yang sudah terpakai!`);
                } else {
                    commandNames.add(cmdName);
                    commands.push(command.data.toJSON());
                }
            }
        }
    }
};

if (fs.existsSync(foldersPath)) {
    readCommandsRecursively(foldersPath);
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`\n🔍 [VALIDASI] Memeriksa struktur ${commands.length} perintah sebelum dikirim...`);
        
        // 1. Validasi Batas Maksimal 100 Perintah dari Discord
        if (commands.length > 100) {
            console.log(`⚠️ PERINGATAN BERSKALA BESAR: Total perintah Anda (${commands.length}) melebihi batas maksimal Discord (100).`);
            console.log(`💡 Solusi: Jalankan filter atau gunakan Subcommands untuk mengelompokkan fitur.`);
        }

        // 2. Mesin Deep-Checker (Melacak error penulisan teks hingga ke tingkat opsi terdalam)
        commands.forEach((cmd, index) => {
            if (cmd.name.length > 32) {
                console.log(`❌ [Index ${index}] /${cmd.name} -> Nama terlalu panjang (${cmd.name.length}/32)`);
            }
            if (cmd.description && cmd.description.length > 100) {
                console.log(`❌ [Index ${index}] /${cmd.name} -> Deskripsi utama terlalu panjang (${cmd.description.length}/100)`);
            }
            
            if (cmd.options) {
                cmd.options.forEach(opt => {
                    if (opt.name.length > 32) {
                        console.log(`❌ [Index ${index}] /${cmd.name} -> Nama opsi [${opt.name}] terlalu panjang (${opt.name.length}/32)`);
                    }
                    if (opt.description && opt.description.length > 100) {
                        console.log(`❌ [Index ${index}] /${cmd.name} -> Deskripsi opsi [${opt.name}] terlalu panjang (${opt.description.length}/100)`);
                    }
                    // Cek isi pilihan (Choices) jika ada
                    if (opt.choices) {
                        opt.choices.forEach(choice => {
                            if (choice.name.length > 100) {
                                console.log(`❌ [Index ${index}] /${cmd.name} -> Nama Pilihan [${choice.name}] di opsi [${opt.name}] terlalu panjang.`);
                            }
                        });
                    }
                });
            }
        });

        // 3. Pembongkar Instan Perintah Pertama (Index 0) yang dilaporkan error oleh Discord
        if (commands.length > 0) {
            console.log(`\n⚙️ [DEBUG] Membongkar Data Perintah Pertama (Index 0):`);
            console.log(JSON.stringify(commands[0], null, 2));
            console.log(`--------------------------------------------------\n`);
        }

        console.log(`⏳ Memulai proses pendaftaran ${commands.length} Slash Commands ke Discord...`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Berhasil mendaftarkan ${data.length} Slash Commands tanpa error!`);
    } catch (error) {
        console.error('\n❌ Terjadi kesalahan saat mendaftarkan perintah ke API Discord:');
        console.error(error);
    }
})();