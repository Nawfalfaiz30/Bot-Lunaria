const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Identifikasi Unik Pengguna Discord
  userId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  
  // Array untuk menampung item yang ditumpuk (Stacking System)
  items: [
    {
      itemId: { 
        type: String, 
        required: true 
      },
      amount: { 
        type: Number, 
        required: true, 
        min: 0, 
        default: 0 
      }
    }
  ]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Inventory', inventorySchema);