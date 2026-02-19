const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('--- [SYSTEM] MOON ENGINE ACTIVE ---');
    } catch (err) { console.error('DB ERROR:', err.message); }
};

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    is_admin: { type: Boolean, default: false }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

app.use(async (req, res, next) => { await connectDB(); next(); });

app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        if (!user) { 
            user = new User({ tg_id: uid }); 
            if(uid === OWNER_ID) { user.subscription = "Ultra"; user.is_admin = true; }
            await user.save(); 
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Роуты для админки и консоли (остаются без изменений)
app.post('/api/owner/set-admin', async (req, res) => { /* ... код из прошлого шага ... */ });
app.post('/api/admin/manage-shards', async (req, res) => { /* ... код из прошлого шага ... */ });

module.exports = app;
app.listen(3000);
