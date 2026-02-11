require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = "8287041036";

// Подключение к БД
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    tgId: String,
    name: String,
    gender: String,
    shards: { type: Number, default: 10 },
    subscription: { type: String, default: 'free' },
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});

const User = mongoose.model('User', userSchema);

// API: Получение юзера
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    if (tgId === OWNER_ID) {
        return res.json({ exists: true, user: { name: "Азуми Ай (BOSS)", shards: "∞", subscription: "Ultra" } });
    }
    try {
        const user = await User.findOne({ tgId });
        res.json({ exists: !!user, user });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: Регистрация
app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    try {
        const newUser = new User({ tgId, name, gender, shards: 100 });
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ОТДАЧА ФРОНТЕНДА (Чтобы не было 404)
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
