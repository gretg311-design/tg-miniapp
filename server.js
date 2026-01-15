const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const MONGO_URL = "mongodb+srv://gretg311_db_user:OsIolza6pQBz3QQb@tg-miniapp.hkflpcb.mongodb.net/ot-a-do-ya?retryWrites=true&w=majority&appName=tg-miniapp";
const OWNER_ID = "8287041036";

app.use(express.json({limit: '15mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// СХЕМА С УЧЕТОМ ИНСТРУКЦИЙ
const userSchema = new mongoose.Schema({
    id: String, 
    name: String, 
    gender: String, 
    balance: { type: Number, default: 100 },
    sub: { type: String, default: "Free" }, 
    subExpires: Date, // Подписка на 30 дней
    role: { type: String, default: "user" },
    streak: { type: Number, default: 1 }, 
    lastDaily: Date
});
const charSchema = new mongoose.Schema({ name: String, age: Number, desc: String, photo: String });
const taskSchema = new mongoose.Schema({ text: String, url: String, reward: Number });

const User = mongoose.model('User', userSchema);
const Char = mongoose.model('Char', charSchema);
const Task = mongoose.model('Task', taskSchema);

mongoose.connect(MONGO_URL).then(() => console.log("--- DB READY ---"));

// АВТОРИЗАЦИЯ
app.post('/api/auth', async (req, res) => {
    const { id, name, gender } = req.body;
    let user = await User.findOne({ id: String(id) });
    if (!user) {
        user = new User({ 
            id: String(id), 
            name, 
            gender, 
            balance: (String(id) === OWNER_ID) ? 9999999 : 100, 
            role: (String(id) === OWNER_ID) ? "owner" : "user" 
        });
        await user.save();
    }
    const [chars, tasks] = await Promise.all([Char.find(), Task.find()]);
    res.json({ user, chars, tasks });
});

// ЕЖЕДНЕВКА (Логика наград и x2 бонуса)
app.post('/api/daily', async (req, res) => {
    const { userId } = req.body;
    let user = await User.findOne({ id: String(userId) });
    
    // Таблица наград из твоих инструкций
    const rewards = { Premium: 50, Pro: 100, VIP: 250, Ultra: 500, Free: 15 };
    let reward = rewards[user.sub] || 15;
    
    // Бонус x2 если стрик 7 дней
    if (user.streak === 7) reward *= 2;

    user.balance += reward;
    user.lastDaily = new Date();
    user.streak = (user.streak >= 7) ? 1 : user.streak + 1;
    await user.save();
    res.json({ success: true, balance: user.balance, streak: user.streak });
});

// УПРАВЛЕНИЕ (СТРОГО ПО ID)
app.post('/api/admin/control', async (req, res) => {
    const { targetId, action, value, senderId, days } = req.body;
    if (String(senderId) !== OWNER_ID) {
        // Проверка если админ пытается выдать что-то (админ может только на фикс. срок)
        const sender = await User.findOne({ id: String(senderId) });
        if (sender.role !== 'admin') return res.status(403).send();
    }
    
    let target = await User.findOne({ id: String(targetId) });
    if (!target) return res.json({ success: false });

    if (action === 'setRole' && String(senderId) === OWNER_ID) target.role = value; // Только овнер назначает админов
    if (action === 'addBalance') target.balance += Number(value);
    if (action === 'setSub') {
        target.sub = value;
        // Подписка на 30 дней (или сколько укажет овнер)
        let expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + (Number(days) || 30));
        target.subExpires = expireDate;
    }

    await target.save();
    res.json({ success: true });
});

// ЗАДАНИЯ (Овнер - удаление/добавление, Админ - только добавление)
app.post('/api/manage-task', async (req, res) => {
    const { action, data, id, userId } = req.body;
    const user = await User.findOne({ id: String(userId) });
    
    if (action === 'add' && (user.role === 'owner' || user.role === 'admin')) {
        await new Task(data).save();
    }
    if (action === 'delete' && user.role === 'owner') {
        await Task.findByIdAndDelete(id);
    }
    res.json({ success: true, tasks: await Task.find() });
});

app.listen(process.env.PORT || 3000);
