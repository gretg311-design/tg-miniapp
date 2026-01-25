const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Коннект к базе с защитой от зависания
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 
}).catch(err => console.log("Ошибка БД:", err));

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' }
}));

// Проверочный путь (вбей в браузере /api/test)
app.get('/api/test', (req, res) => res.send("OK"));

app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        let user = await User.findOne({ tgId });
        if (!user) user = await User.create({ tgId, name, role: tgId == "8287041036" ? 'owner' : 'user' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;
