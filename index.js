const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

// Улучшенное подключение
mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000 // Ждать базу не больше 5 секунд
}).catch(err => console.error("Ошибка подключения к MongoDB:", err));

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 }
}));

app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        
        // Если база не ответит вовремя, блок catch поймает ошибку
        let user = await User.findOne({ tgId: Number(tgId) });
        
        if (!user) {
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name || "Аноним", 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        } else if (Number(tgId) === OWNER_ID && user.role !== 'owner') {
            user.role = 'owner';
            await user.save();
        }
        
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка базы данных", details: e.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
