require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;

// САМОЕ ПРОСТОЕ ПОДКЛЮЧЕНИЕ
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB OK"))
  .catch(err => console.log("DB ERR:", err.message));

const User = mongoose.model('User', new mongoose.Schema({
    tg_id: Number,
    name: String,
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
}));

app.post('/api/auth', async (req, res) => {
    try {
        const state = mongoose.connection.readyState;
        if (state !== 1) {
            return res.status(500).json({ error: "No Connection", status: state });
        }

        const tid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: tid });
        
        if (!user) {
            user = new User({ tg_id: tid, name: req.body.name || "User" });
        }

        if (tid === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
        }

        await user.save();
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
