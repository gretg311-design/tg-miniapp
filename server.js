const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// ТВОИ ДАННЫЕ ПОДКЛЮЧЕНЫ
const MONGO_URL = "mongodb+srv://gretg311_db_user:OsIolza6pQBz3QQb@tg-miniapp.hkflpcb.mongodb.net/ot-a-do-ya?retryWrites=true&w=majority&appName=tg-miniapp";
const OWNER_ID = "8287041036";

app.use(express.json({limit: '15mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// СХЕМЫ ДАННЫХ
const userSchema = new mongoose.Schema({
    id: String, name: String, gender: String, balance: { type: Number, default: 15 },
    sub: { type: String, default: "Free" }, role: String, streak: { type: Number, default: 1 }
});
const charSchema = new mongoose.Schema({
    name: String, age: Number, desc: String, photo: String
});
const itemSchema = new mongoose.Schema({
    name: String, price: Number, currency: String, amount: Number, type: String
});

const User = mongoose.model('User', userSchema);
const Char = mongoose.model('Char', charSchema);
const Item = mongoose.model('Item', itemSchema);

// ПОДКЛЮЧЕНИЕ К БАЗЕ
mongoose.connect(MONGO_URL)
    .then(() => console.log("--- СВЯЗЬ С БАЗОЙ УСТАНОВЛЕНА (OK) ---"))
    .catch(err => console.error("ОШИБКА БД:", err));

// АВТОРИЗАЦИЯ
app.post('/api/auth', async (req, res) => {
    try {
        const { id, name, gender } = req.body;
        let user = await User.findOne({ id: String(id) });
        if (!user) {
            user = new User({
                id: String(id), name: name, gender: gender || "М",
                balance: (String(id) === OWNER_ID) ? 9999999 : 15,
                role: (String(id) === OWNER_ID) ? "owner" : "user"
            });
            await user.save();
        }
        const [chars, items] = await Promise.all([Char.find(), Item.find()]);
        res.json({ user, chars, items });
    } catch (e) { res.status(500).send(e.message); }
});

// УПРАВЛЕНИЕ КОНТЕНТОМ
app.post('/api/manage-char', async (req, res) => {
    const { action, charData, id, userId } = req.body;
    if (action === 'add') await new Char(charData).save();
    if (action === 'delete' && String(userId) === OWNER_ID) await Char.findByIdAndDelete(id);
    res.json({ success: true, chars: await Char.find() });
});

// УПРАВЛЕНИЕ МАГАЗИНОМ
app.post('/api/manage-item', async (req, res) => {
    const { action, itemData, id, userId } = req.body;
    if (String(userId) !== OWNER_ID) return res.status(403).send("No access");
    if (action === 'add') await new Item(itemData).save();
    if (action === 'delete') await Item.findByIdAndDelete(id);
    res.json({ success: true, items: await Item.find() });
});

app.listen(process.env.PORT || 3000, () => console.log("Server is running!"));
