const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Жесткая привязка OWNER_ID (никто не сменит, это на сервере)
const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 }
}));

// API Авторизация
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        let user = await User.findOne({ tgId: Number(tgId) });
        if (!user) {
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name, 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Фикс для "Cannot GET /"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
