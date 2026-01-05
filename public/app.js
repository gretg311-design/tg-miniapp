console.log("🔥 app.js loaded");

const app = document.getElementById("app");

/* ===== Проверка Telegram ===== */
if (!window.Telegram || !Telegram.WebApp) {
  app.innerHTML = `
    <div class="card">
      ❌ Ошибка проверки Telegram
    </div>
  `;
  throw new Error("Not Telegram WebApp");
}

const tg = Telegram.WebApp;
tg.ready();
tg.expand();

/* ===== Пользователь ===== */
const userId = tg.initDataUnsafe?.user?.id;

if (!userId) {
  app.innerHTML = `
    <div class="card">
      ❌ Пользователь не определён
    </div>
  `;
  throw new Error("No user ID");
}

/* ===== ВРЕМЕННЫЕ ДАННЫЕ (заглушка) ===== */
const userData = {
  id: userId,
  balance: 120,
  shards: 3,
};

/* ===== ПЕРСОНАЖИ (заглушка) ===== */
const characters = [
  {
    id: 1,
    name: "Акира",
    desc: "Холодная, умная, доминирующая. Любит контроль и психологические игры.",
    img: "https://i.imgur.com/7QZ6F6R.jpg",
  },
  {
    id: 2,
    name: "Мию",
    desc: "Милая, застенчивая, быстро привязывается. Склонна к зависимости.",
    img: "https://i.imgur.com/1bX5QH6.jpg",
  },
  {
    id: 3,
    name: "Рейна",
    desc: "Провокационная, дерзкая, любит дразнить и проверять границы.",
    img: "https://i.imgur.com/9Yq4YpJ.jpg",
  },
];

/* ===== РЕНДЕР ===== */
renderCharacters();

/* ===== ФУНКЦИИ ===== */

function renderCharacters() {
  app.innerHTML = `
    <h2>🌙 Персонажи</h2>

    <div class="card">
      <div>🆔 ID: ${userData.id}</div>
      <div>💰 Баланс: ${userData.balance}</div>
      <div>✨ Осколки: ${userData.shards}</div>
    </div>

    ${characters
      .map(
        (c) => `
      <div class="card">
        <img src="${c.img}" 
             style="width:100%; border-radius:12px; margin-bottom:10px;" />
        <strong>${c.name}</strong>
        <div style="font-size:13px; opacity:.85; margin-top:6px;">
          ${c.desc}
        </div>
        <button onclick="openChat(${c.id})">
          💬 Начать чат
        </button>
      </div>
    `
      )
      .join("")}

    <button onclick="alert('Магазин скоро')">🛒 Магазин осколков</button>
    <button onclick="alert('Премиум скоро')">⭐ Купить / Продлить подписку</button>
  `;
}

function openChat(characterId) {
  const character = characters.find((c) => c.id === characterId);
  if (!character) return;

  app.innerHTML = `
    <h2>💬 ${character.name}</h2>

    <div class="card" style="min-height:120px;">
      <div style="opacity:.7; font-size:14px;">
        ${character.name} смотрит на тебя и ждёт твоего сообщения…
      </div>
    </div>

    <button onclick="alert('RP-чат будет на следующем шаге')">
      ✍️ Написать
    </button>

    <button onclick="renderCharacters()">
      ⬅️ Назад к персонажам
    </button>
  `;
}
