// Memuat variabel rahasia dari file .env
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    const uri = process.env.MONGO_URI;

    // Pengecekan apakah URI sudah diisi
    if (!uri || uri.includes('masukkan_') || uri.includes('<password>')) {
        console.error('❌ ERROR: MONGO_URI di file .env belum diisi dengan benar.');
        console.error('Pastikan Anda sudah mengganti <password> dengan password database Anda.');
        process.exit(1);
    }

    console.log('🔄 Mencoba terhubung ke MongoDB...');

    try {
        // Mencoba melakukan koneksi
        await mongoose.connect(uri);
        console.log('==================================================');
        console.log('✅ BERHASIL: Koneksi ke MongoDB sukses!');
        console.log('Database siap digunakan untuk menyimpan data Lunaria.');
        console.log('==================================================');
        
        // Mematikan script dengan status sukses
        process.exit(0); 
    } catch (error) {
        console.error('==================================================');
        console.error('❌ GAGAL: Tidak dapat terhubung ke MongoDB.');
        console.error('Detail Error:', error.message);
        console.error('==================================================');
        
        // Mematikan script dengan status error
        process.exit(1); 
    }
}

testConnection();