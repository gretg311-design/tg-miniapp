const app = document.getElementById("app");

/* ===== РОЛИ ===== */
const OWNER_ID = 8287041036; // 👑 ТЫ
let ADMIN_IDS = []; // будут добавляться через кнопку

/* ===== TELEGRAM ===== */
if (!window.Telegram || !Telegram.WebApp) {
  app.innerHTML = "<h2>❌ Не Telegram среда</h2>";
  throw new Error("Not Telegram");
}

const tg = Telegram.WebApp;
tg.ready();
tg.expand();

const user = tg.initDataUnsafe?.user;
if (!user) {
  app.innerHTML = "<h2>❌ Нет пользователя</h2>";
  throw new Error("No user");
}

const userId = user.id;
const isOwner = userId === OWNER_ID;
const isAdmin = isOwner || ADMIN_IDS.includes(userId);

/* ===== ДАННЫЕ (заглушка) ===== */
const state = {
  shards: 50,
};

/* ===== ПЕРСОНАЖИ ===== */
const characters = [
  {
    id: 1,
    name: "Акира",
    desc: "Холодная, доминирующая, умная. Говорит мало, но метко.",
    img: "https://i.imgur.com/7QZ6F6R.jpg",
  },
  {
    id: 2,
    name: "Мию",
    desc: "Милая, застенчивая, эмоциональная. Быстро привязывается.",
    img: "https://i.imgur.com/1bX5QH6.jpg",
  }
];

/* ===== РЕНДЕР ===== */
renderCharacters();

function renderCharacters() {
  app.innerHTML = `
    <h2>🌙 Персонажи</h2>

    <div class="card">
      🆔 ID: ${userId}<br>
      💎 Осколки: ${state.shards}<br>
      🎭 Роль: ${isOwner ? "Овнер" : isAdmin ? "Админ" : "Игрок"}
    </div>

    ${characters.map(c => `
      <div class="card">
        <img src="${c.img}">
        <h3>${c.name}</h3>
        <div>${c.desc}</div>
        <button onclick="openChat(${c.id})">💬 Начать чат</button>
      </div>
    `).join("")}

    <button class="secondary" onclick="alert('Магазин скоро')">🛒 Магазин</button>
    <button class="secondary" onclick="alert('Подписки скоро')">⭐ Купить / Продлить</button>

    ${isAdmin ? `<button class="admin" onclick="openAdmin()">🛠 Админ</button>` : ""}
  `;
}

function openChat(id) {
  const c = characters.find(x => x.id === id);
  app.innerHTML = `
    <h2>💬 ${c.name}</h2>

    <div class="card">
      ${c.name} ждёт твоего сообщения…
    </div>

    <button onclick="alert('RP-движок будет дальше')">✍️ Написать</button>
    <button class="secondary" onclick="renderCharacters()">⬅️ Назад</button>
  `;
}

/* ===== АДМИНКА ===== */
function openAdmin() {
  app.innerHTML = `
    <h2>🛠 Админ-панель</h2>

    ${isOwner ? `
      <div class="card">
        <b>👑 Овнер</b><br><br>

        <button onclick="addAdmin()">➕ Назначить админа</button>
        <button onclick="removeAdmin()">➖ Снять админа</button>
      </div>
    ` : ""}

    <div class="card">
      <b>🔧 Админ</b><br>
      • Добавлять персонажей<br>
      • Выдавать осколки<br>
      • Выдавать премиум
    </div>

    <button class="secondary" onclick="renderCharacters()">⬅️ Назад</button>
  `;
}

function addAdmin() {
  const id = prompt("Введите Telegram ID для назначения админом:");
  if (!id) return;

  const num = Number(id);
  if (ADMIN_IDS.includes(num)) {
    alert("Этот пользователь уже админ");
    return;
  }

  ADMIN_IDS.push(num);
  alert("✅ Админ добавлен");
}

function removeAdmin() {
  const id = prompt("Введите Telegram ID для снятия админа:");
  if (!id) return;

  const num = Number(id);
  ADMIN_IDS = ADMIN_IDS.filter(x => x !== num);
  alert("❌ Админ снят");
}
