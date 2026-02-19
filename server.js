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
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Moon Project</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        body { background: #05010a; color: white; font-family: sans-serif; margin: 0; overflow: hidden; touch-action: none; }
        
        #loading { position: fixed; inset: 0; background: #05010a; z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .moon-logo { width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle, #fff, #888); box-shadow: 0 0 30px #fff; animation: p 2s infinite ease-in-out; }
        @keyframes p { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }

        #app { display: none; padding: 20px; height: 100vh; flex-direction: column; }
        .nick-default { font-size: 20px; font-weight: bold; }
        .nick-ultra { background: linear-gradient(90deg, #bc42f5, #00bcd4, #bc42f5); background-size: 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: s 3s linear infinite; font-weight: 900; font-size: 22px; filter: drop-shadow(0 0 8px #bc42f5); }
        @keyframes s { to {background-position: 200%} }
        
        .sub-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: 800; background: #bc42f5; color: white; text-transform: uppercase; }
        
        /* БЕЙДЖИ РОЛЕЙ */
        .tag-admin { background: #ff4444 !important; box-shadow: 0 0 10px #ff4444; margin-top: 5px; display: inline-block; }
        .tag-owner { background: linear-gradient(45deg, #ffd700, #ff8c00) !important; color: black !important; box-shadow: 0 0 15px #ffd700; margin-top: 5px; display: inline-block; }

        .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 25px; }
        .menu-item { background: #1a0b2e; border: 1px solid #3d2563; border-radius: 12px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; font-weight: bold; font-size: 11px; height: 65px; color: #fff; }
        
        /* КНОПКИ УПРАВЛЕНИЯ */
        .btn-adm { border-color: #00bcd4; color: #00bcd4; display: none; }
        .btn-con { border-color: #e91e63; color: #e91e63; display: none; box-shadow: 0 0 15px rgba(233,30,99,0.2); }

        #console-overlay { display: none; position: fixed; inset: 0; background: rgba(5, 1, 10, 0.98); z-index: 10001; flex-direction: column; align-items: center; padding: 40px 20px; }
        .console-title { color: #e91e63; font-size: 26px; font-weight: 900; letter-spacing: 6px; margin-bottom: 30px; text-transform: uppercase; }
        .console-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
        .console-card { background: #1a0731; border: 1px solid #e91e63; border-radius: 12px; height: 70px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; font-size: 11px; font-weight: bold; }
        
        .term-in { background: #000; border: 1px solid #e91e63; border-radius: 8px; padding: 12px; color: #fff; width: 100%; margin-bottom: 10px; }
        .term-btn { background: #250d45; border: 1px solid #e91e63; padding: 15px; border-radius: 10px; text-align: center; font-size: 11px; font-weight: bold; width: 100%; margin-bottom: 10px; }
        
        #char-img-preview { width: 100%; max-height: 200px; object-fit: contain; background: #000; border: 1px solid #e91e63; display: none; margin-bottom: 10px; }

        .nav { position: fixed; bottom: 0; left: 0; right: 0; height: 70px; display: flex; border-top: 1px solid #1a0b35; }
        .nav-btn { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #333; font-weight: bold; text-transform: uppercase; }
    </style>
</head>
<body>

    <div id="loading"><div class="moon-logo"></div></div>

    <div id="app">
        <div style="display:flex; justify-content:space-between; align-items: center;">
            <div>
                <div style="display:flex; align-items: center;">
                    <span id="u-name" class="nick-default">...</span>
                    <span id="u-badge" class="sub-tag" style="display:none;"></span>
                </div>
                <div id="role-badge" class="sub-tag" style="display:none;"></div>
                <div id="u-id" style="font-size:10px; color:#444; margin-top:4px;">ID: ---</div>
            </div>
            <div style="color:#ffcc00; font-size:24px; font-weight: bold;">🌙 <span id="u-shards">0</span></div>
        </div>

        <div class="menu-grid">
            <div class="menu-item">Чаты</div><div class="menu-item">Персонажи</div>
            <div class="menu-item">Ежедневка</div><div class="menu-item">Задания</div>
            <div class="menu-item">Магазин</div><div class="menu-item">Промокоды</div>
            <div class="menu-item">Профиль</div><div class="menu-item">Настройки</div>
            <div class="menu-item btn-adm" id="nav-adm">Админка</div>
            <div class="menu-item btn-con" id="nav-con" onclick="openConsole()">Консоль</div>
        </div>

        <div class="nav"><div class="nav-btn">◀ Назад</div><div class="nav-btn">🏠 Домой</div></div>
    </div>

    <div id="console-overlay">
        <div class="console-title">CONSOLE</div>
        <div id="con-home" class="console-grid">
            <div class="console-card" onclick="v('con-shards')">осколки</div>
            <div class="console-card" onclick="v('con-subs')">подписки</div>
            <div class="console-card" onclick="v('con-char')">персонаж</div>
            <div class="console-card" onclick="v('con-admins')">админы</div>
        </div>

        <div id="con-shards" style="display:none; width:100%;">
            <input type="number" id="sh-id" placeholder="ID" class="term-in">
            <input type="number" id="sh-count" placeholder="Количество" class="term-in">
            <div class="term-btn" onclick="sendShards('add')" style="color:#39ff14;">ВЫДАТЬ</div>
            <div class="term-btn" onclick="sendShards('take')" style="color:#ff4444;">ЗАБРАТЬ</div>
            <div class="term-btn" onclick="v('con-home')">НАЗАД</div>
        </div>

        <div id="con-subs" style="display:none; width:100%;">
            <input type="number" id="sb-id" placeholder="ID" class="term-in">
            <div class="console-grid">
                <div class="console-card" onclick="sendSub('Premium')">Premium</div>
                <div class="console-card" onclick="sendSub('Pro')">Pro</div>
                <div class="console-card" onclick="sendSub('VIP')">VIP</div>
                <div class="console-card" onclick="sendSub('Ultra')">Ultra</div>
            </div>
            <div class="term-btn" onclick="sendSub('None')" style="color:red; margin-top:10px;">СНЯТЬ</div>
            <div class="term-btn" onclick="v('con-home')">НАЗАД</div>
        </div>

        <div id="con-admins" style="display:none; width:100%;">
            <input type="number" id="adm-id" placeholder="ID" class="term-in">
            <div class="term-btn" onclick="setAdmin(true)" style="color:#39ff14;">НАЗНАЧИТЬ</div>
            <div class="term-btn" onclick="setAdmin(false)" style="color:#ff4444;">СНЯТЬ</div>
            <div class="term-btn" onclick="v('con-home')">НАЗАД</div>
        </div>

        <div style="margin-top:30px; color:#555;" onclick="closeConsole()">[ ЗАКРЫТЬ ]</div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        const OID = 8287041036;

        function openConsole() { document.getElementById('console-overlay').style.display = 'flex'; v('con-home'); }
        function closeConsole() { document.getElementById('console-overlay').style.display = 'none'; }
        function v(id) {
            ['con-home','con-shards','con-subs','con-admins'].forEach(m => document.getElementById(m).style.display = 'none');
            document.getElementById(id).style.display = (id==='con-home'?'grid':'block');
        }

        async function setAdmin(status) {
            const r = await fetch('/api/owner/set-admin', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ owner_id: OID, target_id: document.getElementById('adm-id').value, status: status }) });
            const d = await r.json(); alert(d.message);
        }

        async function sendShards(act) {
            await fetch('/api/admin/manage-shards', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sender_id: tg.initDataUnsafe?.user?.id || OID, target_id: document.getElementById('sh-id').value, amount: document.getElementById('sh-count').value, action: act }) });
            location.reload();
        }

        async function sendSub(type) {
            await fetch('/api/admin/manage-sub', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sender_id: tg.initDataUnsafe?.user?.id || OID, target_id: document.getElementById('sb-id').value, sub_type: type }) });
            location.reload();
        }

        window.onload = async () => {
            setTimeout(() => { document.getElementById('loading').style.display = 'none'; document.getElementById('app').style.display = 'flex'; }, 1500);
            
            const user = tg.initDataUnsafe?.user || { id: OID, first_name: "Owner" };
            const uid = Number(user.id);

            const res = await fetch('/api/user/get-data', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tg_id: uid }) });
            const data = await res.json();

            document.getElementById('u-name').innerText = user.first_name;
            document.getElementById('u-id').innerText = "ID: " + uid;
            document.getElementById('u-shards').innerText = (uid === OID) ? "∞" : (data.shards || 0);

            // Бейджи подписки
            let s = (uid === OID) ? "Ultra" : data.subscription;
            if (s && s !== "None") {
                document.getElementById('u-name').className = "nick-" + s.toLowerCase();
                const b = document.getElementById('u-badge'); b.innerText = s; b.style.display = 'inline-block';
            }

            // ЛОГИКА РОЛЕЙ
            const roleBadge = document.getElementById('role-badge');
            if (uid === OID) {
                roleBadge.innerText = "OWNER";
                roleBadge.className = "sub-tag tag-owner";
                roleBadge.style.display = "inline-block";
                document.getElementById('nav-con').style.display = 'flex'; // Овнеру - Консоль
                document.getElementById('nav-adm').style.display = 'flex'; // Овнеру - Админка
            } else if (data.is_admin) {
                roleBadge.innerText = "ADMIN";
                roleBadge.className = "sub-tag tag-admin";
                roleBadge.style.display = "inline-block";
                document.getElementById('nav-adm').style.display = 'flex'; // Админу - ТОЛЬКО Админка
                document.getElementById('nav-con').style.display = 'none'; // Скрываем консоль совсем
            }
        };
        tg.expand();
    </script>
</body>
</html>
