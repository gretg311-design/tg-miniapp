const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

// 1. ГЛАВНОЕ ИСПРАВЛЕНИЕ: Отдаем index.html при заходе на корень сайта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Позволяем серверу видеть остальные файлы в папке public (стили, скрипты)
app.use(express.static(path.join(__dirname, 'public')));

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
    
    // Проверка на овнера (строго по твоему ID)
    if (parseInt(owner_id) !== OWNER_ID) {
        return res.status(403).json({ error: "Доступ запрещен: ты не овнер!" });
    }

    let db = getDB();
    if (!db[target_id]) db[target_id] = { shards: 0, subscription: null, role: "user" };

    const val = parseInt(amount);
    if (isNaN(val)) return res.status(400).json({ error: "Неверное количество" });

    if (action === 'add') {
        db[target_id].shards += val;
    } else {
        db[target_id].shards = Math.max(0, db[target_id].shards - val);
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ message: `Готово! У юзера ${target_id} теперь ${db[target_id].shards} осколков.` });
});

// Запуск
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`--- СЕРВЕР ЗАПУЩЕН ---`);
    console.log(`Ссылка: http://localhost:${PORT}`);
    console.log(`База данных: ${DB_FILE}`);
});
