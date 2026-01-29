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

// API
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        let user = await User.findOne({ tgId: Number(tgId) });
        if (!user) {
            if (!name) return res.status(404).json({ register: true });
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name, 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ОТДАЕМ ФАЙЛ ИЗ ПАПКИ PUBLIC
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
