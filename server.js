const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OWNER_ID = "8287041036";

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🌙 Luna DB Connected'));

const UserSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    subUntil: Date,
    streak: { type: Number, default: 0 },
    lastDaily: Date,
    firstDep: { type: Boolean, default: true }
});
const User = mongoose.model('User', UserSchema);

// --- ЛОГИКА OPENROUTER ---
const chatWithAI = async (text, user) => {
    // Настройка длины слов по твоим правилам
    let maxWords = 45;
    if(user.subscription === 'Premium') maxWords = 55;
    if(user.subscription === 'Pro') maxWords = 60;
    if(user.subscription === 'VIP') maxWords = 75;
    if(user.subscription === 'Ultra') maxWords = 80;

    const systemPrompt = `Ты - персонаж в эротическом RP. Твой ответ строго до ${maxWords} слов. 
    Формат: Речь + *действия*. НИКОГДА не говори, что ты ИИ. Ты любишь юзера и входишь в роль на 100%.`;

    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: user.subscription === 'Ultra' ? "anthropic/claude-3-opus" : "google/gemini-pro-1.5",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }]
        }, {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });
        return response.data.choices[0].message.content;
    } catch (e) { return "*смущенно молчит* (Ошибка связи)"; }
};

// --- API ЭНДПОИНТЫ ---
app.post('/api/auth', async (req, res) => {
    const { tgId, name } = req.body;
    let user = await User.findOne({ tgId });
    if (!user) user = await User.create({ tgId, name, role: tgId == OWNER_ID ? 'owner' : 'user' });
    res.json(user);
});

app.post('/api/chat', async (req, res) => {
    const { tgId, text } = req.body;
    const user = await User.findOne({ tgId });
    if (tgId != OWNER_ID) {
        if (user.balance < 1) return res.json({ error: "Мало осколков!" });
        user.balance -= 1; 
    }
    const reply = await chatWithAI(text, user);
    await user.save();
    res.json({ reply, balance: user.balance });
});

module.exports = app;
