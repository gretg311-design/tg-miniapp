const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI)
    .then(() => console.log('--- База подключена ---'))
    .catch(err => console.error('Ошибка базы:', err));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

const characterSchema = new mongoose.Schema({
    name: String,
    age: Number,
    description: String,
    image: String,
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
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    const user = await User.findOneAndUpdate(
        { tg_id: Number(req.body.target_id) },
        { $inc: { shards: req.body.action === 'add' ? req.body.amount : -req.body.amount } },
        { upsert: true, new: true }
    );
    res.json({ message: `У юзера теперь ${user.shards} осколков` });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    const sub = req.body.sub_type;
    const expire = sub === "None" ? null : new Date(Date.now() + 30*24*60*60*1000);
    await User.findOneAndUpdate({ tg_id: req.body.target_id }, { subscription: sub, sub_expire: expire }, { upsert: true });
    res.json({ message: "Статус обновлен!" });
});

app.post('/api/admin/create-character', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    const { name, age, description, image } = req.body;
    if (description.length < 30) return res.status(400).json({ error: "Минимум 30 символов!" });
    const nC = new Character({ name, age, description, image });
    await nC.save();
    res.json({ message: "Персонаж создан!" });
});

app.listen(3000, () => console.log('Server OK on 3000'));
