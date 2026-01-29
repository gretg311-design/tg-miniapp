const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URL).catch(err => console.log(err));

const User = mongoose.model('User', new mongoose.Schema({
    tgId: Number,
    name: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 }
}));

// API
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        let user = await User.findOne({ tgId: Number(tgId) });
        if (!user) {
            if (!name) return res.status(404).json({ register: true });
            user = await User.create({ tgId: Number(tgId), name, role: Number(tgId) === OWNER_ID ? 'owner' : 'user' });
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ОТДАЕМ ВЕСЬ ИНТЕРФЕЙС
app.get('*', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        :root { --p-color: #a020f0; --boss-color: #ff3e3e; }
        body { background: #000; color: #fff; font-family: sans-serif; margin: 0; padding: 0; height: 100vh; overflow: hidden; position: fixed; touch-action: none; }
        #loader, #reg-screen { position: fixed; inset: 0; background: #000; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999; }
        .moon { width: 80px; height: 80px; background: #fff; border-radius: 50%; box-shadow: 0 0 40px var(--p-color); animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100% {transform: scale(1);} 50% {transform: scale(1.1);} }
        .reg-input { background: #111; border: 2px solid var(--p-color); color: #fff; padding: 15px; border-radius: 15px; width: 80%; text-align: center; margin-bottom: 20px; outline: none; }
        .reg-btn { background: var(--p-color); color: #fff; border: none; padding: 15px 40px; border-radius: 15px; font-weight: bold; }
        #main-ui { display: none; height: 100vh; flex-direction: column; }
        .header { padding: 20px; border-bottom: 2px solid var(--p-color); display: flex; justify-content: space-between; align-items: center; }
        .boss-glow { color: var(--boss-color); text-shadow: 0 0 10px var(--boss-color); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px; }
        .card { background: #111; border: 1px solid #222; border-radius: 15px; padding: 25px 10px; text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .own-card { grid-column: span 2; border: 2px solid var(--boss-color); color: var(--boss-color); display: none; }
    </style>
</head>
<body>
    <div id="loader"><div class="moon"></div></div>
    <div id="reg-screen" style="display:none;">
        <h2 style="margin-bottom:20px;">КТО ТЫ?</h2>
        <input type="text" id="name-input" class="reg-input" placeholder="ИМЯ..." maxlength="12">
        <button class="reg-btn" onclick="register()">ВОЙТИ</button>
    </div>
    <div id="main-ui">
        <div class="header">
            <div>
                <div id="u-name" style="font-size:18px; font-weight:900;">ЗАГРУЗКА</div>
                <div style="font-size:10px; color:#444;">ID: <span id="u-id">---</span></div>
            </div>
            <div id="u-bal" style="color:#f1c40f; font-weight:900; font-size:20px;">🌙 0</div>
        </div>
        <div class="grid">
            <div class="card">Чаты</div><div class="card">Персонажи</div>
            <div class="card">Ежедневка</div><div class="card">Промокоды</div>
            <div class="card">Магазин</div><div class="card">Задания</div>
            <div id="own-card" class="card own-card">Консоль BOSS</div>
        </div>
    </div>
    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const BOSS_ID = 8287041036;
        const myId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : BOSS_ID;

        async function auth(name = null) {
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ tgId: myId, name })
                });
                if (res.status === 404) {
                    document.getElementById('loader').style.display = 'none';
                    document.getElementById('reg-screen').style.display = 'flex';
                    return;
                }
                const data = await res.json();
                render(data);
            } catch (e) { console.error(e); }
        }

        function register() {
            const n = document.getElementById('name-input').value.trim();
            if (n) auth(n);
        }

        function render(user) {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('reg-screen').style.display = 'none';
            document.getElementById('main-ui').style.display = 'flex';
            document.getElementById('u-id').innerText = user.tgId;
            const nEl = document.getElementById('u-name');
            nEl.innerText = user.name.toUpperCase();
            if (Number(user.tgId) === BOSS_ID) {
                nEl.classList.add('boss-glow');
                nEl.innerText += " [BOSS]";
                document.getElementById('u-bal').innerText = "🌙 ∞";
                document.getElementById('own-card').style.display = 'block';
            } else {
                document.getElementById('u-bal').innerText = "🌙 " + user.balance;
            }
        }
        auth();
        document.addEventListener('touchmove', (e) => e.preventDefault(), {passive: false});
    </script>
</body>
</html>
    `);
});

module.exports = app;
