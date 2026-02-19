const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI).then(() => console.log('--- [SYSTEM] MOON ENGINE ACTIVE ---'));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null },
    is_admin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

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
    } catch (e) { res.status(500).send(e); }
});

app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No Access");
    const { target_id, status } = req.body;
    await User.findOneAndUpdate({ tg_id: Number(target_id) }, { is_admin: status }, { upsert: true });
    res.json({ message: status ? `ID ${target_id} теперь Админ` : `ID ${target_id} снят` });
});

app.post('/api/admin/manage-shards', async (req, res) => {
    const sender = await User.findOne({ tg_id: Number(req.body.sender_id) });
    if (Number(req.body.sender_id) !== OWNER_ID && (!sender || !sender.is_admin)) return res.status(403).send("No");
    await User.findOneAndUpdate(
        { tg_id: Number(req.body.target_id) },
        { $inc: { shards: req.body.action === 'add' ? Number(req.body.amount) : -Number(req.body.amount) } },
        { upsert: true }
    );
    res.json({ message: `Баланс обновлен` });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    const sender = await User.findOne({ tg_id: Number(req.body.sender_id) });
    if (Number(req.body.sender_id) !== OWNER_ID && (!sender || !sender.is_admin)) return res.status(403).send("No");
    const exp = req.body.sub_type === "None" ? null : new Date(Date.now() + 30*24*60*60*1000);
    await User.findOneAndUpdate({ tg_id: req.body.target_id }, { subscription: req.body.sub_type, sub_expire: exp }, { upsert: true });
    res.json({ message: "Подписка изменена" });
});

app.listen(3000, () => console.log('Moon Engine Started'));
