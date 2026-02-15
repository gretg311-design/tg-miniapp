require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB Connected"))
    .catch(err => console.error("DB Error:", err));

// Схема юзера
const User = mongoose.model('User', new mongoose.Schema({
    tg_id: Number,
    name: String,
    moon_shards: { type: Number, default: 100 },
    role: { type: String, default: 'user' }
}));

// Авторизация
app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name } = req.body;
        let user = await User.findOne({ tg_id: Number(tg_id) });

        if (!user) {
            user = await User.create({ tg_id: Number(tg_id), name: name || "User" });
        }

        // Если ты Овнер - всегда макс. права и баланс
        if (Number(tg_id) === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            await user.save();
        }

        // Отправляем чистый JSON
        res.json({
            id: user.tg_id,
            user_name: user.name,
            shards: user.moon_shards,
            user_role: user.role
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Начисление осколков
app.post('/api/give', async (req, res) => {
    try {
        const { target_id, amount } = req.body;
        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { moon_shards: Number(amount) } },
            { new: true, upsert: true }
        );
        res.json({ success: true, new_balance: user.moon_shards });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
