const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const MONGO_URL = "mongodb+srv://gretg311_db_user:OsIolza6pQBz3QQb@tg-miniapp.hkflpcb.mongodb.net/ot-a-do-ya?retryWrites=true&w=majority&appName=tg-miniapp";
const OWNER_ID = "8287041036"; // ТВОЙ ID

app.use(express.json({limit: '15mb'}));
app.use(express.static(path.join(__dirname, 'public')));

const userSchema = new mongoose.Schema({
    id: String, name: String, gender: String, balance: { type: Number, default: 100 },
    sub: { type: String, default: "Free" }, role: { type: String, default: "user" },
    streak: { type: Number, default: 1 }, lastDaily: Date
});
const User = mongoose.model('User', userSchema);
const Char = mongoose.model('Char', charSchema = new mongoose.Schema({ name: String, age: Number, desc: String, photo: String }));
const Task = mongoose.model('Task', taskSchema = new mongoose.Schema({ text: String, url: String, reward: Number }));

mongoose.connect(MONGO_URL).then(() => console.log("--- DB CONNECTED ---"));

app.post('/api/auth', async (req, res) => {
    try {
        const { id, name, gender } = req.body;
        let user = await User.findOne({ id: String(id) });
        
        if (!user) {
            // Если заходит OWNER_ID - даем бесконечный баланс и роль owner
            const isOwner = String(id) === OWNER_ID;
            user = new User({ 
                id: String(id), 
                name: name || "Player", 
                gender: gender || "М", 
                balance: isOwner ? 9999999 : 100, 
                role: isOwner ? "owner" : "user" 
            });
            await user.save();
        } else {
            // На всякий случай обновляем роль, если ID совпал
            if (String(id) === OWNER_ID && user.role !== 'owner') {
                user.role = 'owner';
                await user.save();
            }
        }
        const [chars, tasks] = await Promise.all([Char.find(), Task.find()]);
        res.json({ user, chars, tasks });
    } catch (e) { res.status(500).send(e.message); }
});

// Админка: выдача по ID
app.post('/api/admin/control', async (req, res) => {
    const { targetId, action, value, senderId } = req.body;
    if (String(senderId) !== OWNER_ID) return res.status(403).send("No");
    
    let target = await User.findOne({ id: String(targetId) });
    if (!target) return res.json({ success: false, msg: "Не найден" });

    if (action === 'setRole') target.role = value;
    if (action === 'addBalance') target.balance += Number(value);
    await target.save();
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
