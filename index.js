const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 }
}));

// API АВТОРИЗАЦИИ
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        if (!tgId) return res.status(400).json({ error: "No ID" });

        let user = await User.findOne({ tgId: Number(tgId) });

        if (!user) {
            if (!name) {
                // Юзера нет и имя не прислали — отправляем сигнал на регистрацию
                return res.status(404).json({ register: true });
            }
            // Регистрация нового
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name, 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;
