const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const MONGO_URL = "mongodb+srv://gretg311_db_user:OsIolza6pQBz3QQb@tg-miniapp.hkflpcb.mongodb.net/ot-a-do-ya?retryWrites=true&w=majority";
const OWNER_ID = "8287041036";

app.use(express.json({limit: '1mb'}));
app.use(express.static(path.join(__dirname, 'public')));

const userSchema = new mongoose.Schema({
    id: String, name: String, gender: String, balance: { type: Number, default: 100 },
    sub: { type: String, default: "Free" }, subExpires: Date,
    role: { type: String, default: "user" }, streak: { type: Number, default: 1 }, lastDaily: Date
});
const taskSchema = new mongoose.Schema({ text: String, url: String, reward: Number });

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("DB OK"))
    .catch(err => console.log("DB ERR, RECONNECTING..."));

app.post('/api/auth', async (req, res) => {
    try {
        const { id, name, gender } = req.body;
        let user = await User.findOne({ id: String(id) });
        if (!user) {
            const isOwner = String(id) === OWNER_ID;
            user = new User({ 
                id: String(id), name, gender, 
                balance: isOwner ? 888888 : 100, 
                role: isOwner ? "owner" : "user" 
            });
            await user.save();
        }
        const tasks = await Task.find();
        res.json({ user, tasks });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/daily', async (req, res) => {
    const { userId } = req.body;
    let user = await User.findOne({ id: String(userId) });
    const rewards = { Premium: 50, Pro: 100, VIP: 250, Ultra: 500, Free: 15 };
    let reward = rewards[user.sub] || 15;
    if (user.streak >= 7) reward *= 2;
    user.balance += reward;
    user.streak = user.streak >= 7 ? 1 : user.streak + 1;
    await user.save();
    res.json({ balance: user.balance, streak: user.streak });
});

app.post('/api/admin/control', async (req, res) => {
    const { targetId, action, value, senderId } = req.body;
    const sender = await User.findOne({ id: String(senderId) });
    if (!sender || (sender.role !== 'owner' && sender.role !== 'admin')) return res.status(403).send();
    let target = await User.findOne({ id: String(targetId) });
    if (!target) return res.json({ success: false });
    if (action === 'addBalance') target.balance += Number(value);
    if (action === 'setRole' && sender.role === 'owner') target.role = value;
    await target.save();
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
