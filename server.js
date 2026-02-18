const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI).then(() => console.log('--- База Moon готова ---'));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

const characterSchema = new mongoose.Schema({
    name: String, age: Number, description: String, image: String
});
const Character = mongoose.model('Character', characterSchema);

app.post('/api/user/get-data', async (req, res) => {
    const uid = Number(req.body.tg_id);
    let user = await User.findOne({ tg_id: uid });
    if (!user) { 
        user = new User({ tg_id: uid }); 
        if(uid === OWNER_ID) user.subscription = "Ultra";
        await user.save(); 
    }
    res.json(user);
});

app.post('/api/admin/manage-shards', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    const user = await User.findOneAndUpdate(
        { tg_id: Number(req.body.target_id) },
        { $inc: { shards: req.body.action === 'add' ? Number(req.body.amount) : -Number(req.body.amount) } },
        { upsert: true, new: true }
    );
    res.json({ message: `Готово. Шарды: ${user.shards}` });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    const exp = req.body.sub_type === "None" ? null : new Date(Date.now() + 30*24*60*60*1000);
    await User.findOneAndUpdate({ tg_id: req.body.target_id }, { subscription: req.body.sub_type, sub_expire: exp }, { upsert: true });
    res.json({ message: "Подписка обновлена" });
});

app.post('/api/admin/create-char', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    if (req.body.description.length < 30) return res.status(400).json({error: "Минимум 30 символов!"});
    const c = new Character(req.body);
    await c.save();
    res.json({ message: "Персонаж создан" });
});

app.listen(3000, () => console.log('Moon Server OK'));
