<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Moon Project</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        /* ЗАЩИТА И БЛОКИРОВКА СВАЙПА */
        html, body {
            background-color: #05010a; color: white; font-family: sans-serif;
            margin: 0; padding: 0; height: 100vh; width: 100vw;
            overflow: hidden; touch-action: none;
        }

        /* ЛУНА И ЗАГРУЗКА */
        #loading-screen {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #05010a; z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .disclaimer { position: absolute; top: 20px; right: 20px; font-size: 10px; color: #444; }
        .moon-box {
            width: 100px; height: 100px; border-radius: 50%;
            background: radial-gradient(circle, #fff 0%, #ddd 70%, #888 100%);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
            animation: moon-pulse 2s infinite ease-in-out; margin-bottom: 25px;
        }
        @keyframes moon-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

        /* ИНТЕРФЕЙС */
        #app-content { display: none; padding: 20px; box-sizing: border-box; height: 100vh; flex-direction: column; }
        .ultra-nick {
            font-size: 22px; font-weight: bold;
            background: linear-gradient(90deg, #bc42f5, #00bcd4, #bc42f5);
            background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            animation: shine 3s linear infinite;
        }
        @keyframes shine { to { background-position: 200% center; } }
        .balance { font-size: 26px; color: #ffcc00; display: flex; align-items: center; gap: 8px; }

        /* СЕТКА МЕНЮ */
        .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .menu-item {
            background: #120520; border: 1px solid #2d1b4d; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            text-transform: uppercase; font-weight: bold; font-size: 11px; height: 65px;
        }
        .btn-adm { border-color: #00bcd4; color: #00bcd4; display: none; }
        .btn-con { border-color: #e91e63; color: #e91e63; display: none; }

        /* КОНСОЛЬ */
        #console-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(5, 1, 10, 0.98); z-index: 10005; 
            flex-direction: column; align-items: center; padding: 20px; box-sizing: border-box;
        }
        .console-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
        .console-btn {
            background: #1a0b35; border: 1px solid #e91e63; border-radius: 10px;
            height: 55px; display: flex; align-items: center; justify-content: center;
            font-size: 10px; text-transform: uppercase; font-weight: bold; color: white;
        }
        #shard-manager { display: none; width: 100%; flex-direction: column; gap: 10px; }
        .console-input {
            background: #120520; border: 1px solid #e91e63; border-radius: 8px; padding: 15px; color: white; width: 100%; box-sizing: border-box;
        }

        /* НАВИГАЦИЯ */
        .bottom-nav {
            position: fixed; bottom: 0; left: 0; right: 0; height: 70px;
            display: flex; border-top: 1px solid #1a0b35; background: #05010a;
        }
        .nav-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #aaa; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    </style>
</head>
<body oncontextmenu="return false;">

    <div id="loading-screen">
        <div class="disclaimer">все персонажи вымышлены</div>
        <div class="moon-box"></div>
        <div class="loading-text">загрузка мира....</div>
        <p style="color:#333; font-size:10px; margin-top:20px;">версия 1.0.1</p>
    </div>

    <div id="console-modal">
        <h2 style="color:#e91e63; text-transform:uppercase;">Панель Создателя</h2>
        <div id="console-main-grid" class="console-grid">
            <div class="console-btn" onclick="openS()">Осколки</div>
            <div class="console-btn" onclick="alert('Подписки')">Подписки</div>
            <div class="console-btn" onclick="alert('Персонаж')">Персонаж</div>
            <div class="console-btn" onclick="alert('Цены')">Цены</div>
            <div class="console-btn" onclick="alert('Назначить админа')">Назначить админа</div>
            <div class="console-btn" onclick="alert('Промокоды')">Промокоды</div>
            <div class="console-btn" onclick="alert('Задания')">Задания</div>
        </div>

        <div id="shard-manager">
            <input type="number" id="tid" placeholder="Telegram ID" class="console-input">
            <input type="number" id="amt" placeholder="Количество" class="console-input">
            <div class="console-grid">
                <div class="console-btn" onclick="send('add')" style="border-color:#4caf50; color:#4caf50;">Выдать</div>
                <div class="console-btn" onclick="send('take')" style="border-color:#f44336; color:#f44336;">Забрать</div>
            </div>
            <div class="console-btn" onclick="closeS()" style="border-color:#555; margin-top:10px;">Назад</div>
        </div>
        <div onclick="toggleC(false)" style="margin-top:40px; color:#555;">[ ЗАКРЫТЬ ]</div>
    </div>

    <div id="app-content">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><div id="un" class="regular-nick">---</div><div id="ui" style="font-size:12px; color:#555;">ID: ---</div></div>
            <div class="balance">🌙 <span id="us">0</span></div>
        </div>

        <div class="menu-grid">
            <div class="menu-item">Чаты</div><div class="menu-item">Персонажи</div>
            <div class="menu-item">Ежедневка</div><div class="menu-item">Задания</div>
            <div class="menu-item">Магазин</div><div class="menu-item">Промокоды</div>
            <div class="menu-item">Профиль</div><div class="menu-item">Настройки</div>
            <div id="btn-adm" class="menu-item btn-adm">Админка</div>
            <div id="btn-con" class="menu-item btn-con" onclick="toggleC(true)">Консоль</div>
        </div>

        <div class="bottom-nav">
            <div class="nav-btn" style="border-right:1px solid #1a0b35;">◀ Назад</div>
            <div class="nav-btn">🏠 Домой</div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation(); // ПОДТВЕРЖДЕНИЕ ЗАКРЫТИЯ

        const OID = 8287041036;

        function toggleC(s) { document.getElementById('console-modal').style.display = s ? 'flex' : 'none'; }
        function openS() { document.getElementById('console-main-grid').style.display = 'none'; document.getElementById('shard-manager').style.display = 'flex'; }
        function closeS() { document.getElementById('console-main-grid').style.display = 'grid'; document.getElementById('shard-manager').style.display = 'none'; }

        async function send(act) {
            const id = document.getElementById('tid').value;
            const a = document.getElementById('amt').value;
            if(!id || !a) return alert("Заполни поля!");

            const r = await fetch('/api/admin/manage-shards', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ owner_id: OID, target_id: id, amount: a, action: act })
            });
            const d = await r.json();
            alert(d.message || d.error);
        }

        window.onload = () => {
            const user = tg.initDataUnsafe?.user || { id: OID, first_name: "Owner" };
            document.getElementById('un').innerText = user.first_name;
            document.getElementById('ui').innerText = "ID: " + user.id;

            if (user.id == OID) {
                document.getElementById('un').className = "ultra-nick";
                document.getElementById('us').innerText = "∞";
                document.getElementById('btn-adm').style.display = "flex";
                document.getElementById('btn-con').style.display = "flex";
            }
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = "none";
                document.getElementById('app-content').style.display = "flex";
            }, 1500);
        };

        // ЗАЩИТА ОТ ПУЛЛА (СВАЙПА ВНИЗ)
        document.addEventListener('touchmove', (e) => { if(e.touches.length > 1 || window.scrollY === 0) e.preventDefault(); }, { passive: false });
    </script>
</body>
</html>
