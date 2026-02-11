require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
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
    streak: { type: Number, default: 0 },
    lastCheckIn: Date,
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});

const charSchema = new mongoose.Schema({
    name: String,
    age: String,
    photo: String,
    desc: String,
    creatorId: String
});

const User = mongoose.model('User', userSchema);
const Char = mongoose.model('Char', charSchema);

// --- ЛОГИКА ИИ (OpenRouter) ---
app.post('/api/chat', async (req, res) => {
    const { tgId, text, charId } = req.body;
    const user = await User.findOne({ tgId });
    const isOwner = tgId === OWNER_ID;

    if (!isOwner && (!user || user.shards < 1)) return res.status(403).json({ error: "Нет осколков" });

    const character = await Char.findById(charId);
    const vulgarityLevels = [
        "без пошлости", "легкая пошлость", "средняя пошлость", 
        "высокая пошлость", "очень высокая пошлость", "максимальная пошлость, пошляк до костей"
    ];

    try {
        const aiRes = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "system", content: `Ты - ${character.name}, ${character.desc}. Веди себя как человек. Никогда не говори, что ты ИИ. Твой уровень пошлости: ${vulgarityLevels[user.settings.vulgarity - 1]}. Юзер: ${user.name}, пол: ${user.gender}.` },
                { role: "user", content: text }
            ],
            max_tokens: user.settings.msgLength * 5
        }, {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });

        if (!isOwner) {
            user.shards -= 1;
            await user.save();
        }

        res.json({ text: aiRes.data.choices[0].message.content, shards: isOwner ? "∞" : user.shards });
    } catch (e) { res.status(500).json({ error: "Ошибка ИИ" }); }
});

// --- МАГАЗИН И КОНСОЛЬ ---
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    if (tgId === OWNER_ID) return res.json({ exists: true, user: { name: "BOSS", shards: "∞", subscription: "Ultra" } });
    const user = await User.findOne({ tgId });
    res.json({ exists: !!user, user });
});

app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    await new User({ tgId, name, gender, shards: 10 }).save();
    res.json({ success: true });
});

app.post('/api/admin/add-char', async (req, res) => {
    const { name, age, photo, desc, creatorId } = req.body;
    await new Char({ name, age, photo, desc, creatorId }).save();
    res.json({ success: true });
});

app.get('/api/chars', async (req, res) => {
    const chars = await Char.find();
    res.json(chars);
});

module.exports = app;
