const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const MONGO_URL = "mongodb+srv://gretg311_db_user:OsIolza6pQBz3QQb@tg-miniapp.hkflpcb.mongodb.net/ot-a-do-ya?retryWrites=true&w=majority&appName=tg-miniapp";
const OWNER_ID = "8287041036"; // Твой ID

app.use(express.json({limit: '5mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// СХЕМЫ
const userSchema = new mongoose.Schema({
    id: String, name: String, gender: String, balance: { type: Number, default: 100 },
    sub: { type: String, default: "Free" }, subExpires: Date,
    role: { type: String, default: "user" }, streak: { type: Number, default: 1 }, lastDaily: Date
});
const taskSchema = new mongoose.Schema({ text: String, url: String, reward: Number });

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// ПОДКЛЮЧЕНИЕ (с таймаутом, чтобы не вешать память)
mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("--- СВЯЗЬ С БАЗОЙ УСТАНОВЛЕНА (OK) ---"))
    .catch(err => console.error("ОШИБКА БАЗЫ:", err.message));

// АВТОРИЗАЦИЯ
app.post('/api/auth', async (req, res) => {
    try {
        const { id, name, gender } = req.body;
        let user = await User.findOne({ id: String(id) });
        if (!user) {
            const isOwner = String(id) === OWNER_ID;
            user = new User({
                id: String(id), name, gender,
                balance: isOwner ? 9999999 : 100,
                role: isOwner ? "owner" : "user"
            });
            await user.save();
        } else if (String(id) === OWNER_ID) {
            user.role = 'owner'; // Принудительно
            await user.save();
        }
        const tasks = await Task.find();
        res.json({ user, tasks });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// УПРАВЛЕНИЕ ПО ID (Только для Овнера)
app.post('/api/admin/control', async (req, res) => {
    const { targetId, action, value, senderId } = req.body;
    if (String(senderId) !== OWNER_ID) return res.status(403).send("No access");
    let target = await User.findOne({ id: String(targetId) });
    if (!target) return res.json({ success: false, msg: "Не найден" });

    if (action === 'addBalance') target.balance += Number(value);
    if (action === 'setRole') target.role = value;
    if (action === 'setSub') {
        target.sub = value;
        let d = new Date(); d.setDate(d.getDate() + 30);
        target.subExpires = d;
    }
    await target.save();
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running!"));
