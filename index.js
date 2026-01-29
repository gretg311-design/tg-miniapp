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

const userSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    streak: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        if (!tgId) return res.status(400).send("No ID");

        let user = await User.findOne({ tgId: Number(tgId) });
        
        // Одноразовая регистрация + проверка на BOSS
        if (!user) {
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name, 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        } else {
            // Если ты уже в базе, но зашел с этого ID - сервер подтверждает статус OWNER
            if (Number(tgId) === OWNER_ID && user.role !== 'owner') {
                user.role = 'owner';
                await user.save();
            }
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
