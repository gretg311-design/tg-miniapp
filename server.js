const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const { MONGO_URL, OWNER_ID, PORT = 8080 } = process.env;

// Важно для Railway: Health Check
app.get('/', (req, res) => res.send('SERVER_ACTIVE'));

mongoose.connect(MONGO_URL)
    .then(() => console.log('🌙 БД ПОДКЛЮЧЕНА'))
    .catch(err => console.error('❌ ОШИБКА БД:', err));

const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    streak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', UserSchema);

app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        let user = await User.findOne({ tgId });
        if (!user) {
            const isOwner = (tgId == OWNER_ID);
            user = await User.create({
                tgId, name,
                role: isOwner ? 'owner' : 'user',
                balance: isOwner ? 999999 : 100,
                subscription: isOwner ? 'Ultra' : 'None'
            });
        }
        res.json(user);
    } catch (e) { res.status(500).send(e.message); }
});

// Запуск (0.0.0.0 — критично!)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ЛУНА НА ПОРТУ ${PORT}`);
});
