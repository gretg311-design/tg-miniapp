const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI)
    .then(() => console.log('--- MOON DATABASE CONNECTED ---'))
    .catch(err => console.error('DATABASE ERROR:', err));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

const characterSchema = new mongoose.Schema({
    name: String, age: Number, description: String, image: String,
    createdAt: { type: Date, default: Date.now }
});
const Character = mongoose.model('Character', characterSchema);

app.post('/api/user/get-data', async (req, res) => {
    try {
        let user = await User.findOne({ tg_id: Number(req.body.tg_id) });
        if (!user) { user = new User({ tg_id: Number(req.body.tg_id) }); await user.save(); }
        res.json(user);
    } catch (err) { res.status(500).send("Error"); }
});

app.post('/api/admin/manage-shards', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No Access");
    const { target_id, amount, action } = req.body;
    const user = await User.findOneAndUpdate(
        { tg_id: Number(target_id) },
        { $inc: { shards: action === 'add' ? Number(amount) : -Number(amount) } },
        { upsert: true, new: true }
    );
    res.json({ message: `Баланс ID ${target_id} обновлен: ${user.shards}` });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No Access");
    const { target_id, sub_type } = req.body;
    const expire = sub_type === "None" ? null : new Date(Date.now() + 30*24*60*60*1000);
    await User.findOneAndUpdate({ tg_id: target_id }, { subscription: sub_type, sub_expire: expire }, { upsert: true });
    res.json({ message: "Статус подписки изменен!" });
});

app.post('/api/admin/create-character', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No Access");
    const { name, age, description, image } = req.body;
    if (description.length < 30 || description.length > 4000) return res.status(400).json({ error: "Лимит описания: 30-4000 символов!" });
    const nC = new Character({ name, age, description, image });
    await nC.save();
    res.json({ message: "Персонаж успешно создан!" });
});

app.listen(3000, () => console.log('Moon Engine Started on Port 3000'));
