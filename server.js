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
    .catch(err => console.log("DB Error:", err));

const User = mongoose.model('User', new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
}));

// API: Вход (Жесткая проверка Овнера)
app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";
        
        let role = 'user';
        let shards_to_set = 100;

        if (tid === OWNER_ID) {
            role = 'owner';
            shards_to_set = 999999999;
        }

        const user = await User.findOneAndUpdate(
            { tg_id: tid },
            { 
                $set: { name: name, role: role },
                $setOnInsert: { moon_shards: shards_to_set, sub: tid === OWNER_ID ? 'Ultra' : 'free' }
            },
            { new: true, upsert: true }
        );

        // Если ты овнер, но в базе старые данные - форсим баланс
        if (tid === OWNER_ID && user.moon_shards < 999999999) {
            user.moon_shards = 999999999;
            await user.save();
        }

        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: Выдача осколков
app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { admin_id, target_id, amount } = req.body;
        const a_id = Number(admin_id);
        
        if (a_id !== OWNER_ID) {
            const admin = await User.findOne({ tg_id: a_id });
            if (!admin || admin.role !== 'admin') return res.status(403).json({ status: "error" });
        }

        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { moon_shards: Number(amount) } },
            { new: true, upsert: true }
        );
        res.json({ status: "success", new_balance: user.moon_shards });
    } catch (e) { res.status(500).json({ status: "error" }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

module.exports = app;
