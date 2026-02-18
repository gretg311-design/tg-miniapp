const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Лимит для передачи фото в Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI)
    .then(() => console.log('--- База Moon: Связь установлена ---'))
    .catch(err => console.error('Ошибка MongoDB:', err));

// СХЕМА ПОЛЬЗОВАТЕЛЯ
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null },
    streak: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// СХЕМА ПЕРСОНАЖА
const characterSchema = new mongoose.Schema({
    owner_id: Number,
    name: String,
    age: Number,
    description: String,
    image: String, 
    createdAt: { type: Date, default: Date.now }
});
const Character = mongoose.model('Character', characterSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ПОЛУЧЕНИЕ ДАННЫХ ЮЗЕРА
app.post('/api/user/get-data', async (req, res) => {
    try {
        let user = await User.findOne({ tg_id: Number(req.body.tg_id) });
        if (!user) {
            user = new User({ tg_id: Number(req.body.tg_id) });
            await user.save();
        }
        res.json(user);
    } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

// АДМИН: ОСКОЛКИ
app.post('/api/admin/manage-shards', async (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "No Access" });
    try {
        let user = await User.findOne({ tg_id: Number(target_id) });
        if (!user) user = new User({ tg_id: Number(target_id) });
        const val = parseInt(amount) || 0;
        user.shards = (action === 'add') ? user.shards + val : Math.max(0, user.shards - val);
        await user.save();
        res.json({ message: `ID ${target_id}: теперь ${user.shards} осколков` });
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

// АДМИН: ПОДПИСКИ
app.post('/api/admin/manage-sub', async (req, res) => {
    const { owner_id, target_id, sub_type } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "No Access" });
    try {
        let expireDate = (sub_type === "None") ? null : new Date();
        if(expireDate) expireDate.setDate(expireDate.getDate() + 30);
        await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { subscription: sub_type, sub_expire: expireDate },
            { upsert: true }
        );
        res.json({ message: sub_type === "None" ? "Подписка снята" : `Выдана ${sub_type}` });
    } catch (err) { res.status(500).json({ error: "Sub Error" }); }
});

// АДМИН: СОЗДАНИЕ ПЕРСОНАЖА (С лимитами)
app.post('/api/admin/create-character', async (req, res) => {
    const { owner_id, name, age, description, image } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "No Access" });
    
    try {
        if (!name || name.trim().length === 0) return res.status(400).json({ error: "Имя обязательно!" });
        if (parseInt(age) < 18) return res.status(400).json({ error: "Возраст только 18+!" });
        if (description.length < 30 || description.length > 4000) {
            return res.status(400).json({ error: "Описание должно быть от 30 до 4000 символов!" });
        }

        const newChar = new Character({ owner_id, name, age, description, image });
        await newChar.save();
        res.json({ message: "Персонаж успешно добавлен в мир!" });
    } catch (err) { res.status(500).json({ error: "Ошибка базы данных" }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`--- Moon Server: 3000 ---`));
