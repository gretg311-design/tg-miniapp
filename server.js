require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Разрешаем CORS для всех запросов
app.use(cors()); 
app.use(express.json());

const OWNER_ID = "8287041036";
const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN; // Добавь в Vercel

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('Ошибка подключения MongoDB:', err));

// Схема пользователя (остается такой же)
const userSchema = new mongoose.Schema({
    tgId: { type: String, unique: true, required: true },
    name: String,
    gender: String,
    shards: { type: Number, default: 10 },
    subscription: { type: String, default: 'free' },
    subEndDate: Date,
    streak: { type: Number, default: 0 },
    lastCheckIn: Date,
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});
const User = mongoose.model('User', userSchema);

// Эндпоинт для проверки пользователя и его регистрации
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    console.log(`Проверка пользователя с TG ID: ${tgId}`);

    if (!tgId) {
        return res.status(400).json({ error: "TG ID обязателен" });
    }

    if (tgId === OWNER_ID) {
        return res.json({ exists: true, user: { tgId: OWNER_ID, name: "Овнер", shards: "∞", subscription: "Бесконечная", gender: "male" }, isOwner: true });
    }

    try {
        const user = await User.findOne({ tgId });
        res.json({ exists: !!user, user: user || null, isOwner: false });
    } catch (error) {
        console.error("Ошибка при поиске пользователя:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Эндпоинт для регистрации нового пользователя
app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    console.log(`Попытка регистрации: ${tgId}, ${name}, ${gender}`);

    if (!tgId || !name || !gender) {
        return res.status(400).json({ error: "Все поля регистрации обязательны" });
    }

    try {
        let user = await User.findOne({ tgId });
        if (user) {
            return res.status(409).json({ error: "Пользователь уже зарегистрирован" });
        }

        user = new User({ tgId, name, gender, shards: 100 }); // Дадим 100 осколков для старта
        await user.save();
        console.log(`Пользователь ${tgId} успешно зарегистрирован.`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Ошибка при регистрации:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});


// ... Остальные эндпоинты (chat, pay, generate-photo, etc.)
// ... Все, что мы ранее обсуждали, добавляется здесь ниже

// Пример заглушки для других эндпоинтов, чтобы не было 404
app.post('/api/chat', async (req, res) => {
    const { tgId, text } = req.body;
    if (tgId === OWNER_ID) {
        return res.json({ text: "Слушаю, босс. Лимиты отключены.", shardsLeft: "∞" });
    }
    // ... Логика чата
    res.json({ text: "Привет от ИИ! Ваш ID: " + tgId + ", сообщение: " + text });
});

app.post('/api/generate-photo', (req, res) => res.json({ url: 'https://via.placeholder.com/200', shardsLeft: 'X' }));
app.post('/api/pay', (req, res) => res.json({ invoice_url: 'https://pay.crypt.bot/test_invoice' }));


module.exports = app;
