const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ТВОЙ ID
const OWNER_ID = 8287041036;

// ВСТАВЬ СВОЮ ССЫЛКУ ИЗ MONGODB ATLAS НИЖЕ
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

// Схема пользователя (автоматически создает структуру в базе)
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true, required: true },
    name: { type: String, default: "User" },
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' },
    last_checkin: { type: Date, default: Date.now },
    streak: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// Подключение к MongoDB с настройками стабильности
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // ждем 5 секунд и выдаем ошибку, если база не ответила
})
.then(() => console.log("✅ MongoDB Atlas: Соединение установлено!"))
.catch(err => console.error("❌ MongoDB Atlas: Ошибка подключения:", err.message));

// API Авторизации и Регистрации
app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";

        if (!tid) return res.status(400).json({ error: "Missing Telegram ID" });

        // 1. Пытаемся найти пользователя
        let user = await User.findOne({ tg_id: tid });

        // 2. Если нет — РЕГИСТРИРУЕМ (Автоматически запомнит его)
        if (!user) {
            console.log(`Регистрация нового игрока [ID: ${tid}]`);
            user = new User({ 
                tg_id: tid, 
                name: name,
                moon_shards: (tid === OWNER_ID) ? 999999999 : 100,
                role: (tid === OWNER_ID) ? 'owner' : 'user',
                sub: (tid === OWNER_ID) ? 'Ultra' : 'free'
            });
            await user.save();
        }

        // 3. Если это ты — проверяем права (на случай, если зашел с другого акка или база обновилась)
        if (tid === OWNER_ID && (user.role !== 'owner' || user.moon_shards < 1000000)) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
            await user.save();
        }

        // Отправляем чистый JSON пользователю
        res.json(user);
    } catch (e) {
        console.error("Критическая ошибка сервера:", e.message);
        res.status(500).json({ error: "DATABASE_ERROR", message: e.message });
    }
});

// Раздача фронтенда
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));

module.exports = app;