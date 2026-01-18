const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// --- АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПАПОК ДЛЯ СТАБИЛЬНОСТИ ---
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json());
app.use(express.static(publicDir));

const { MONGO_URL, OWNER_ID, PORT = 8080 } = process.env;

// Обработка ошибок подключения к БД
mongoose.connect(MONGO_URL)
    .then(() => console.log('🌙 БД ПОДКЛЮЧЕНА'))
    .catch(err => {
        console.error('КРИТИЧЕСКАЯ ОШИБКА БД:', err.message);
        process.exit(1); // Выход, если база не алё
    });

const UserSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    gender: { type: String, default: 'Мужской' },
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    streak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: new Date(0) },
    lengthOffset: { type: Number, default: 50 }
});
const User = mongoose.model('User', UserSchema);

// Эндпоинты
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId } = req.body;
        let user = await User.findOne({ tgId });
        if (!user) return res.json({ isNew: true });
        
        if (String(tgId) === String(OWNER_ID)) {
            user.role = 'owner';
            user.subscription = 'Ultra';
            await user.save();
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
    try {
        const { tgId, name, gender } = req.body;
        const user = await User.create({
            tgId, name, gender,
            role: (String(tgId) === String(OWNER_ID)) ? 'owner' : 'user'
        });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/update-settings', async (req, res) => {
    try {
        const { tgId, name, gender, lengthOffset } = req.body;
        const user = await User.findOneAndUpdate({ tgId }, { name, gender, lengthOffset }, { new: true });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/daily', async (req, res) => {
    try {
        const { tgId } = req.body;
        const user = await User.findOne({ tgId });
        const rewards = { 'Free': 15, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
        let reward = rewards[user.subscription] || 15;
        user.balance += reward;
        user.lastDaily = new Date();
        await user.save();
        res.json({ reward, balance: user.balance });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Запуск на 0.0.0.0 критичен для Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 СЕРВЕР ЖИВ НА ПОРТУ ${PORT}`);
});
