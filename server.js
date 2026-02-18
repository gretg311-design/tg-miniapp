const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const DB_FILE = './users.json';

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/admin/manage-shards', (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "Нет прав" });

    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
    let db = JSON.parse(fs.readFileSync(DB_FILE));

    if (!db[target_id]) db[target_id] = { shards: 0, sub: "None", role: "user" };

    const val = parseInt(amount) || 0;
    if (action === 'add') db[target_id].shards += val;
    else db[target_id].shards = Math.max(0, db[target_id].shards - val);

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ message: `Успешно! Баланс ID ${target_id}: ${db[target_id].shards}` });
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));
