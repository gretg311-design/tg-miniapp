const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ПЕРЕМЕННЫЕ ИЗ RAILWAY
const MONGO_URL = process.env.MONGO_URL;
const OWNER_ID = process.env.OWNER_ID; 
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

mongoose.connect(MONGO_URL)
    .then(() => console.log('🌙 СИСТЕМА ГОТОВА: База Осколков подключена'))
    .catch(err => console.error('❌ Ошибка MongoDB:', err.message));

// --- СХЕМЫ ДАННЫХ ---

const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    name: String,
    gender: String,
    role: { type: String, default: 'user' }, // user, admin, owner
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    subExpiry: { type: Date },
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 },
    settings: {
        msgLength: { type: Number, default: 45 }, // Мин 45 слов
        lewdness: { type: String, default: 'минимум' } // минимум, средняя, сильная, максимум
    }
});
const User = mongoose.model('User', UserSchema);

const CharacterSchema = new mongoose.Schema({
    name: String,
    age: Number,
    description: String,
    photo: String,
    creatorId: Number
});
const Character = mongoose.model('Character', CharacterSchema);

// --- ЛОГИКА РЕГИСТРАЦИИ И ВХОДА ---

app.post('/api/auth', async (req, res) => {
    const { tgId, name, gender } = req.body;
    let user = await User.findOne({ tgId });

    if (!user) {
        const isOwner = (tgId == OWNER_ID);
        user = await User.create({
            tgId,
            name,
            gender,
            role: isOwner ? 'owner' : 'user',
            balance: isOwner ? 999999999 : 100,
            subscription: 'Ultra', // Бонус всем на старте
            subExpiry: isOwner ? new Date(2099, 0, 1) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
    }
    res.json(user);
});

// --- ЕЖЕДНЕВКА (x2 для всех на 7 день) ---

app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    if (!user) return res.status(404).send();

    const now = new Date();
    const diff = (now - user.lastDaily) / (1000 * 60 * 60);
    if (diff < 24) return res.json({ success: false, msg: `Жди еще ${Math.ceil(24 - diff)}ч.` });

    user.streak = (diff < 48) ? user.streak + 1 : 1;
    const REWARDS = { 'None': 20, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
    let reward = REWARDS[user.subscription] || 20;
    
    if (user.streak >= 7) reward *= 2; // x2 бонус для всех

    user.balance += reward;
    user.lastDaily = now;
    await user.save();
    res.json({ success: true, reward, balance: user.balance, streak: user.streak });
});

// --- ЧАТ С ПЕРСОНАЖЕМ (OpenRouter + Правила RP) ---

app.post('/api/chat', async (req, res) => {
    const { tgId, charName, userMessage } = req.body;
    const user = await User.findOne({ tgId });
    
    // Блокировка если нет осколков
    if (user.balance < 1) return res.json({ reply: "*У вас закончились Осколки Луны...*" });

    // Лимиты слов по подписке
    let maxWords = 45;
    if (['Premium', 'Pro'].includes(user.subscription)) maxWords = 80;
    if (['VIP', 'Ultra'].includes(user.subscription)) maxWords = 100;

    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-pro-1.5", 
            messages: [
                {
                    role: "system",
                    content: `Ты - ${charName}. Общайся как реальный человек. НИКОГДА не говори, что ты ИИ. 
                    ОПИСЫВАЙ свои действия и чувства ВНУТРИ ЗВЕЗДОЧЕК *вот так*.
                    ПИШИ длинные сообщения (ОТ 45 ДО ${maxWords} СЛОВ). 
                    Уровень пошлости: ${user.settings.lewdness}.`
                },
                { role: "user", content: userMessage }
            ]
        }, {
            headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;
        
        // Цена за фото/сообщение
        const price = (['VIP', 'Ultra'].includes(user.subscription)) ? 1 : (['Premium', 'Pro'].includes(user.subscription) ? 2 : 5);
        user.balance -= price; 
        await user.save();

        res.json({ reply, balance: user.balance });
    } catch (e) {
        res.json({ reply: "*Персонаж задумался и не смог ответить...*" });
    }
});

// --- АДМИН ПАНЕЛЬ ---

app.post('/api/admin/add-char', async (req, res) => {
    const { adminId, name, age, description, photo } = req.body;
    const admin = await User.findOne({ tgId: adminId });
    
    if (!['admin', 'owner'].includes(admin.role)) return res.status(403).send();

    await Character.create({ name, age, description, photo, creatorId: adminId });
    res.json({ success: true });
});

// --- ЗАПУСК ---

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер "от А до Я" запущен на порту ${PORT}`);
});
