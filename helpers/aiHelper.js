const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Inisialisasi SDK Google Generative AI menggunakan API Key dari file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
    /**
     * Menghasilkan teks balasan AI (Untuk fitur Chat, Summarize, Translate, Persona)
     * @param {String} prompt - Teks pertanyaan/perintah dari pengguna
     * @param {String} systemInstruction - (Opsional) Instruksi khusus untuk mengubah sifat AI (Persona)
     * @returns {String} - Balasan dari AI
     */
    generateText: async (prompt, systemInstruction = null) => {
        try {
            // Menggunakan gemini-1.5-flash karena sangat cepat dan serba bisa
            const modelConfig = { model: "gemini-1.5-flash" };
            
            // Jika ada instruksi persona (misal: "Bicaralah seperti bajak laut"), tambahkan ke konfigurasi
            if (systemInstruction) {
                modelConfig.systemInstruction = systemInstruction;
            } else {
                modelConfig.systemInstruction = "Kamu adalah Lunaria, bot Discord asisten yang ramah, sedikit sarkas tapi suka membantu, dan suka bermain game RPG.";
            }

            const model = genAI.getGenerativeModel(modelConfig);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
            
        } catch (error) {
            console.error("[AI GENERATE TEXT ERROR]", error);
            return "Maaf, kepalaku sedang pusing. Aku tidak bisa memproses permintaanmu saat ini.";
        }
    },

    /**
     * Menganalisis gambar menggunakan AI (Untuk fitur /vision)
     * @param {String} prompt - Pertanyaan pengguna mengenai gambar tersebut
     * @param {Buffer} imageBuffer - Data gambar mentah (didapat dari lampiran pesan Discord)
     * @param {String} mimeType - Tipe file gambar (contoh: "image/png" atau "image/jpeg")
     * @returns {String} - Deskripsi atau jawaban AI tentang gambar
     */
    analyzeImage: async (prompt, imageBuffer, mimeType) => {
        try {
            // gemini-1.5-flash secara bawaan mendukung Vision (multimodal)
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Mengubah buffer gambar dari Discord menjadi format base64 yang bisa dibaca oleh API
            const imageParts = [
                {
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: mimeType
                    }
                }
            ];

            // Mengirim prompt teks dan bagian gambar secara bersamaan
            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            return response.text();
            
        } catch (error) {
            console.error("[VISION AI ERROR]", error);
            return "Hmm, mataku sedikit buram. Aku tidak bisa melihat gambar ini dengan jelas. Pastikan formatnya benar (PNG/JPG/WEBP).";
        }
    }
};