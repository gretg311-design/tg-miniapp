const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Раздача статики (Твой интерфейс)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Подключение к базе
mongoose.connect(process.env.MONGO_URL).catch(err => console.log("DB Error:", err));

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' }
}));

const OWNER_ID = 8287041036;

// 3. API Маршруты
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        if (!tgId) return res.status(400).json({ error: "No ID" });
        let user = await User.findOne({ tgId: Number(tgId) });
        if (!user) {
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name || "User", 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. ГЛАВНАЯ СТРАНИЦА (Фикс Cannot GET /)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
