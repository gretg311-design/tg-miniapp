require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = "8287041036";

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    tgId: String,
    name: String,
    gender: String,
    shards: { type: Number, default: 10 },
    subscription: { type: String, default: 'free' },
    subEndDate: Date,
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});

const User = mongoose.model('User', userSchema);

// Получение данных юзера по ID
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    if (tgId === OWNER_ID) {
        return res.json({ exists: true, user: { name: "Азуми Ай (BOSS)", shards: "∞", subscription: "Ultra" } });
    }
    const user = await User.findOne({ tgId });
    res.json({ exists: !!user, user: user || null });
});

// Регистрация
app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    let user = new User({ tgId, name, gender });
    await user.save();
    res.json({ success: true });
});

// Заглушка для чата (1 сообщение = 1 осколок)
app.post('/api/chat', async (req, res) => {
    const { tgId } = req.body;
    if (tgId === OWNER_ID) return res.json({ text: "Да, босс." });
    const user = await User.findOne({ tgId });
    if (user.shards > 0) {
        user.shards -= 1;
        await user.save();
        res.json({ text: "ИИ отвечает..." });
    } else {
        res.status(403).json({ error: "Нет осколков" });
    }
});

module.exports = app;
