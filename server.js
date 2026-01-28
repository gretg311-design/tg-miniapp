const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Коннект к БД (убедись, что 0.0.0.0/0 в MongoDB Atlas включен)
mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' }, // user, admin, owner
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    lastDaily: Date,
    streak: { type: Number, default: 0 }
}));

const OWNER_ID = 8287041036;

app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        if (!tgId) return res.status(400).send("Missing ID");
        
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

// Пример выдачи прав только по ID (для Owner в консоли)
app.post('/api/set-admin', async (req, res) => {
    const { bossId, targetId } = req.body;
    if (Number(bossId) !== OWNER_ID) return res.status(403).send("Access Denied");
    
    await User.findOneAndUpdate({ tgId: Number(targetId) }, { role: 'admin' });
    res.send("Admin added by ID");
});

module.exports = app;
