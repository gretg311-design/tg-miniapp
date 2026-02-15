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

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .catch(err => console.log("DB ERROR:", err.message));

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    streak: { type: Number, default: 0 },
    last_daily: Date
});
const User = mongoose.model('User', UserSchema);

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name } = req.body;
        let user = await User.findOne({ tg_id });
        if (!user) user = await User.create({ tg_id, name: name || "User", moon_shards: 100 });
        if (tg_id === OWNER_ID) {
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;
