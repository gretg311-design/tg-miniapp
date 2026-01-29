const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

// Коннект с таймаутом, чтобы сервер не висел вечно
mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000 
}).catch(err => console.log("Ошибка базы:", err));

app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        if (!tgId) return res.status(400).json({ error: "No ID" });

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

// Отдаем HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
