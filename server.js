const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const MONGO_URL = "mongodb+srv://gretg311_db_user:OsIolza6pQBz3QQb@tg-miniapp.hkflpcb.mongodb.net/ot-a-do-ya?retryWrites=true&w=majority&appName=tg-miniapp";
const OWNER_ID = "8287041036";

app.use(express.json({limit: '15mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// СХЕМЫ
const userSchema = new mongoose.Schema({
    id: String, name: String, gender: String, balance: { type: Number, default: 100 },
    sub: { type: String, default: "Free" }, subExpires: Date,
    role: { type: String, default: "user" }, streak: { type: Number, default: 1 }, lastDaily: Date
});
const itemSchema = new mongoose.Schema({ name: String, price: Number, currency: String });
const charSchema = new mongoose.Schema({ name: String, age: Number, desc: String, photo: String });
const taskSchema = new mongoose.Schema({ text: String, url: String, reward: Number });

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);
const Char = mongoose.model('Char', charSchema);
const Task = mongoose.model('Task', taskSchema);

mongoose.connect(MONGO_URL).then(() => console.log("--- DB CONNECTED OK ---"));

// ВХОД
app.post('/api/auth', async (req, res) => {
    try {
        const { id, name, gender } = req.body;
        let user = await User.findOne({ id: String(id) });
        if (!user) {
            const isOwner = String(id) === OWNER_ID;
            user = new User({ id: String(id), name, gender, balance: isOwner ? 999999 : 100, role: isOwner ? "owner" : "user" });
            await user.save();
        }
        const [items, chars, tasks] = await Promise.all([Item.find(), Char.find(), Task.find()]);
        res.json({ user, items, chars, tasks });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// АДМИН-ПАНЕЛЬ (СТРОГО ПО ID)
app.post('/api/admin/control', async (req, res) => {
    const { targetId, action, value, senderId, days } = req.body;
    const sender = await User.findOne({ id: String(senderId) });
    if (!sender || (sender.role !== 'owner' && sender.role !== 'admin')) return res.status(403).send();

    let target = await User.findOne({ id: String(targetId) });
    if (!target) return res.json({ success: false });

    if (action === 'addBalance') target.balance += Number(value);
    if (action === 'setSub') {
        target.sub = value;
        let d = new Date(); d.setDate(d.getDate() + (Number(days) || 30));
        target.subExpires = d;
    }
    if (action === 'setRole' && sender.role === 'owner') target.role = value;

    await target.save();
    res.json({ success: true });
});

// УПРАВЛЕНИЕ КОНТЕНТОМ (Овнер может удалять, Админ только добавлять)
app.post('/api/manage', async (req, res) => {
    const { type, action, data, id, userId } = req.body;
    const user = await User.findOne({ id: String(userId) });
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) return res.status(403).send();

    const Model = type === 'item' ? Item : (type === 'char' ? Char : Task);
    if (action === 'add') await new Model(data).save();
    if (action === 'delete' && user.role === 'owner') await Model.findByIdAndDelete(id);

    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
