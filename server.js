const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const OWNER_ID = 8287041036;
const DB_FILE = './users.json';

// Загрузка базы
function getDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(DB_FILE));
}

// Ручка управления осколками
app.post('/api/admin/manage-shards', (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    
    if (owner_id != OWNER_ID) return res.status(403).json({ error: "Нет прав!" });

    let db = getDB();
    if (!db[target_id]) db[target_id] = { shards: 0, subscription: null };

    const val = parseInt(amount);
    if (action === 'add') db[target_id].shards += val;
    else db[target_id].shards = Math.max(0, db[target_id].shards - val);

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ message: `Осколки юзера ${target_id} обновлены. Баланс: ${db[target_id].shards}` });
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));
