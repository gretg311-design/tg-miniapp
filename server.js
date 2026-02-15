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

// Подключение с обработкой ошибок
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true, required: true },
    name: { type: String, default: "User" },
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
});

const User = mongoose.model('User', userSchema);

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        if (!tid) return res.status(400).json({ error: "No TG ID provided" });

        // Ищем юзера. Если нет — создаем.
        let user = await User.findOne({ tg_id: tid });
        
        if (!user) {
            user = new User({ tg_id: tid, name: req.body.name || "User" });
        }

        // ЖЕСТКАЯ ПЕРЕЗАПИСЬ ДЛЯ ОВНЕРА
        if (tid === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
        }

        await user.save();

        res.json({
            tg_id: Number(user.tg_id),
            name: String(user.name),
            moon_shards: Number(user.moon_shards),
            role: String(user.role),
            sub: String(user.sub)
        });
    } catch (e) {
        console.error("AUTH ERROR:", e);
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// Роут для выдачи
app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { target_id, amount } = req.body;
        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { moon_shards: Number(amount) } },
            { new: true, upsert: true }
        );
        res.json({ status: "success", new_balance: user.moon_shards });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
