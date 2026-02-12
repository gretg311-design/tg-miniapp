require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = "8287041036";

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    tgId: String, name: String, gender: String, shards: { type: Number, default: 10 },
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});
const User = mongoose.model('User', userSchema);

// API
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    if (tgId === OWNER_ID) return res.json({ exists: true, user: { name: "Азуми Ай (BOSS)", shards: "∞" } });
    const user = await User.findOne({ tgId });
    res.json({ exists: !!user, user });
});

app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    await User.findOneAndUpdate({ tgId }, { name, gender, shards: 10 }, { upsert: true });
    res.json({ success: true });
});

// Отдача фронтенда
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
