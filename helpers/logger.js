const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Mengarahkan path ke folder logs di luar folder helpers
const systemLogPath = path.join(__dirname, '../logs/system.log');
const errorLogPath = path.join(__dirname, '../logs/error.log');

// Kode warna ANSI untuk mempercantik Terminal/Console
const colors = {
    time: '\x1b[90m',    // Abu-abu terang
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Hijau
    warn: '\x1b[33m',    // Kuning
    error: '\x1b[31m',   // Merah
    reset: '\x1b[0m'     // Mengembalikan warna ke standar
};

// Fungsi internal untuk menulis ke file secara asinkron
function writeToFile(filePath, text) {
    fs.appendFile(filePath, text + '\n', (err) => {
        if (err) console.error(`${colors.error}[LOGGER ERROR]${colors.reset} Gagal menulis log ke file:`, err);
    });
}

module.exports = {
    info: (message) => {
        const time = moment().format('YYYY-MM-DD HH:mm:ss');
        const logText = `[${time}] [INFO] ${message}`;
        
        console.log(`${colors.time}[${time}]${colors.reset} ${colors.info}[INFO]${colors.reset} ${message}`);
        writeToFile(systemLogPath, logText);
    },
    
    success: (message) => {
        const time = moment().format('YYYY-MM-DD HH:mm:ss');
        const logText = `[${time}] [SUCCESS] ${message}`;
        
        console.log(`${colors.time}[${time}]${colors.reset} ${colors.success}[SUCCESS]${colors.reset} ${message}`);
        writeToFile(systemLogPath, logText);
    },
    
    warn: (message) => {
        const time = moment().format('YYYY-MM-DD HH:mm:ss');
        const logText = `[${time}] [WARN] ${message}`;
        
        console.log(`${colors.time}[${time}]${colors.reset} ${colors.warn}[WARN]${colors.reset} ${message}`);
        writeToFile(systemLogPath, logText);
    },
    
    error: (message, errObject = null) => {
        const time = moment().format('YYYY-MM-DD HH:mm:ss');
        let logText = `[${time}] [ERROR] ${message}`;
        
        // Menampilkan pesan error utama
        console.error(`${colors.time}[${time}]${colors.reset} ${colors.error}[ERROR]${colors.reset} ${message}`);
        
        // Jika ada object error spesifik (misal dari Try-Catch), tampilkan detail dan stack trace-nya
        if (errObject) {
            console.error(errObject);
            logText += `\nDetail: ${errObject.stack || errObject.message || errObject}`;
        }
        
        // Tulis ke file error khusus
        writeToFile(errorLogPath, logText);
    }
};