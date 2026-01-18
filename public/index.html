const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer'); // Для загрузки фото из галереи
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'public/uploads/' }); // Папка для фото

app.use(express.json());
app.use(express.static('public'));

const { MONGO_URL, OWNER_ID, PORT = 8080 } = process.env;

mongoose.connect(MONGO_URL).then(() => console.log('🌙 БД ПОДКЛЮЧЕНА'));

// Схема юзера
const UserSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    gender: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    streak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', UserSchema);

// Схема персонажа
const CharSchema = new mongoose.Schema({
    name: String,
    desc: String,
    photo: String,
    creatorId: Number
});
const Char = mongoose.model('Character', CharSchema);

// Вход и проверка BOSS
app.post('/api/auth', async (req, res) => {
    const { tgId, name } = req.body;
    let user = await User.findOne({ tgId });
    if (!user) return res.json({ isNew: true });
    
    // Если зашел Овнер — всегда BOSS и Ultra
    if (tgId == OWNER_ID) {
        user.role = 'owner';
        user.subscription = 'Ultra';
        await user.save();
    }
    res.json(user);
});

// Ежедневка (15-500 + x2 стрейк)
app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    const rewards = { 'Free': 15, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
    let reward = rewards[user.subscription] || 15;
    
    const now = new Date();
    const diff = (now - user.lastDaily) / (1000 * 60 * 60 * 24);

    if (diff < 1) return res.status(400).json({ error: "Еще не время" });
    
    if (diff <= 2) user.streak += 1; else user.streak = 1;
    if (user.streak >= 7) reward *= 2;

    user.balance += reward;
    user.lastDaily = now;
    await user.save();
    res.json({ reward, balance: user.balance });
});

// Создание персонажа (Фото из галереи)
app.post('/api/create-character', upload.single('photo'), async (req, res) => {
    const { name, desc, creatorId } = req.body;
    await Char.create({
        name,
        desc,
        photo: `/uploads/${req.file.filename}`,
        creatorId
    });
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 СЕРВЕР ЗАПУЩЕН` text));
