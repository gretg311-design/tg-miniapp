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
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err));

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: { type: String, default: "User" },
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// АВТОРИЗАЦИЯ
app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name } = req.body;
        if (!tg_id) return res.status(400).json({ status: "error", message: "No ID" });

        let user = await User.findOne({ tg_id: Number(tg_id) });
        if (!user) {
            user = await User.create({ tg_id: Number(tg_id), name: name || "User" });
        }

        if (Number(tg_id) === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
            await user.save();
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

// ВЫДАЧА ОСКОЛКОВ
app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { admin_id, target_id, amount } = req.body;
        const admin = await User.findOne({ tg_id: Number(admin_id) });
        
        if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) {
            return res.status(403).json({ status: "error", message: "У вас нет прав" });
        }

        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { moon_shards: Number(amount) } },
            { new: true, upsert: true }
        );
        res.json({ status: "success", new_balance: user.moon_shards });
    } catch (e) {
        res.status(500).json({ status: "error", message: "Не удалось выдать" });
    }
});

// ДОБАВЛЕНИЕ АДМИНА
app.post('/api/admin/add', async (req, res) => {
    try {
        const { owner_id, target_id } = req.body;
        if (Number(owner_id) !== OWNER_ID) {
            return res.status(403).json({ status: "error", message: "Только Овнер" });
        }

        await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { role: 'admin' },
            { upsert: true }
        );
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).json({ status: "error", message: "Ошибка базы" });
    }
});

module.exports = app;
