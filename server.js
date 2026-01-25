const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("DB Connected")).catch(err => console.log("DB Error:", err));

// Схема пользователя
const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' }
}));

const OWNER_ID = 8287041036;

// API авторизации
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        if (!tgId) return res.status(400).json({ error: "No ID provided" });

        let user = await User.findOne({ tgId: Number(tgId) });
        if (!user) {
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name || "User", 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Проверка работоспособности
app.get('/api/health', (req, res) => res.json({ status: "working" }));

module.exports = app;
