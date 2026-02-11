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
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});

const charSchema = new mongoose.Schema({
    name: String, age: String, photo: String, desc: String
});

const User = mongoose.model('User', userSchema);
const Char = mongoose.model('Char', charSchema);

// Поиск юзера
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    if (tgId === OWNER_ID) return res.json({ exists: true, user: { name: "Азуми Ай (BOSS)", shards: "∞" } });
    const user = await User.findOne({ tgId });
    res.json({ exists: !!user, user });
});

// Регистрация
app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    await new User({ tgId, name, gender, shards: 10 }).save();
    res.json({ success: true });
});

// Чат с ИИ (OpenRouter)
app.post('/api/chat', async (req, res) => {
    const { tgId, text, charId } = req.body;
    const user = (tgId === OWNER_ID) ? { name: "BOSS", gender: "male", settings: { vulgarity: 6, msgLength: 100 } } : await User.findOne({ tgId });
    const character = await Char.findById(charId);

    const vulgarityDesc = ["без пошлости", "легко", "средне", "сильно", "очень сильно", "максимально, пошляк до костей"];
    
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "system", content: `Ты ${character.name}. Твой стиль: ${character.desc}. Уровень пошлости: ${vulgarityDesc[user.settings.vulgarity-1]}. Юзер: ${user.name}.` },
                { role: "user", content: text }
            ]
        }, { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } });

        if (tgId !== OWNER_ID) { user.shards -= 1; await user.save(); }
        res.json({ text: response.data.choices[0].message.content });
    } catch (e) { res.status(500).send("AI Error"); }
});

module.exports = app;
