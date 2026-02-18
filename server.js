const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI)
    .then(() => console.log('--- [SUCCESS] MOON DB CONNECTED ---'))
    .catch(err => console.error('--- [ERROR] DB CONNECTION FAILED:', err));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

// ПОЛУЧЕНИЕ ДАННЫХ (С проверкой Овнера)
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        console.log(`Запрос данных для ID: ${uid}`); // Лог в терминале
        
        let user = await User.findOne({ tg_id: uid });
        if (!user) {
            user = new User({ tg_id: uid });
            // Если это ты, сразу даем Ультру в базе на всякий случай
            if (uid === OWNER_ID) {
                user.subscription = "Ultra";
            }
            await user.save();
        }
        res.json(user);
    } catch (err) { 
        console.error("Ошибка get-data:", err);
        res.status(500).json({ error: "Server Error" }); 
    }
});

// АДМИНКА: ОСКОЛКИ
app.post('/api/admin/manage-shards', async (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).send("Forbidden");
    
    try {
        const val = Number(amount);
        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { shards: action === 'add' ? val : -val } },
            { upsert: true, new: true }
        );
        res.json({ message: `Успешно! Баланс ID ${target_id}: ${user.shards}` });
    } catch (e) { res.status(500).send("Error"); }
});

// АДМИНКА: ПОДПИСКИ
app.post('/api/admin/manage-sub', async (req, res) => {
    const { owner_id, target_id, sub_type } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).send("Forbidden");
    
    try {
        const expire = sub_type === "None" ? null : new Date(Date.now() + 30*24*60*60*1000);
        await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { subscription: sub_type, sub_expire: expire },
            { upsert: true }
        );
        res.json({ message: `ID ${target_id}: Статус ${sub_type} обновлен` });
    } catch (e) { res.status(500).send("Error"); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`--- [SYSTEM] MOON RUNNING ON PORT ${PORT} ---`));
