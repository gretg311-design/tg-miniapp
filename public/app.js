const app = document.getElementById("app");

/* ===== РОЛИ ===== */
const OWNER_ID = 8287041036;
let ADMIN_IDS = [];

/* ===== TELEGRAM ===== */
const tg = Telegram.WebApp;
tg.ready();
tg.expand();

const user = tg.initDataUnsafe?.user;
if (!user) {
  app.innerHTML = "❌ Ошибка Telegram";
  throw new Error("No user");
}

const userId = user.id;
const isOwner = userId === OWNER_ID;
const isAdmin = isOwner || ADMIN_IDS.includes(userId);

/* ===== ПЕРСОНАЖИ ===== */
const characters = [
  {
    id: 1,
    name: "Акира",
    img: "https://i.imgur.com/7QZ6F6R.jpg",
    desc: "Холодная, доминирующая, умная. Любит контроль и психологические игры.",
    story: "Бывшая стратег элитной корпорации, исчезла после эксперимента с ИИ."
  },
  {
    id: 2,
    name: "Мию",
    img: "https://i.imgur.com/QrKp5jY.jpg",
    desc: "Милая, застенчивая, эмоциональная. Быстро привязывается.",
    story: "Однажды проснулась в цифровом мире и боится снова остаться одна."
  }
];

let chats = [];

/* ===== ГЛАВНАЯ ===== */
function renderHome() {
  app.innerHTML = `
    <h2>🌙 Anime AI 18+</h2>

    <div class="grid">
      <div class="card">
        💬 Чаты
        <button onclick="renderChats()">Открыть</button>
      </div>

      <div class="card">
        🧍 Персонажи
        <button onclick="renderCharacters()">Выбрать</button>
      </div>

      <div class="card">
        🛒 Магазин
        <button onclick="alert('Осколки скоро')">Осколки</button>
      </div>

      <div class="card">
        ⭐ Premium
        <button onclick="alert('Подписка скоро')">Купить</button>
      </div>
    </div>

    <div class="card">
      👤 Профиль
      <button onclick="renderProfile()">Пол / Настройки</button>
    </div>

    ${isAdmin ? `
      <div class="card">
        🛠 Админ-панель
        <button class="admin" onclick="renderAdmin()">Открыть</button>
      </div>
    ` : ""}
  `;
}

/* ===== ПЕРСОНАЖИ ===== */
function renderCharacters() {
  app.innerHTML = `
    <h2>🧍 Персонажи</h2>

    ${characters.map(c => `
      <div class="card">
        <img class="char" src="${c.img}">
        <h3>${c.name}</h3>
        <div>${c.desc}</div>
        <small>${c.story}</small><br><br>
        <button onclick="startChat(${c.id})">💬 Начать чат</button>
      </div>
    `).join("")}
  `;
}

/* ===== ЧАТЫ ===== */
function startChat(id) {
  if (!chats.includes(id)) chats.push(id);
  renderChats();
}

function renderChats() {
  app.innerHTML = `
    <h2>💬 Чаты</h2>

    ${chats.length === 0 ? "Пока нет чатов" : ""}

    ${chats.map(id => {
      const c = characters.find(x => x.id === id);
      return `
        <div class="card">
          <b>${c.name}</b><br>
          <button onclick="openChat(${id})">Открыть</button>
        </div>
      `;
    }).join("")}
  `;
}

function openChat(id) {
  const c = characters.find(x => x.id === id);
  app.innerHTML = `
    <h2>💬 ${c.name}</h2>
    <div class="card">Чат с ИИ будет на следующем этапе</div>
    <button onclick="renderChats()">⬅️ Назад</button>
  `;
}

/* ===== ПРОФИЛЬ ===== */
function renderProfile() {
  app.innerHTML = `
    <h2>👤 Профиль</h2>
    <div class="card">
      🆔 ID: ${userId}<br>
      👑 Роль: ${isOwner ? "Овнер" : isAdmin ? "Админ" : "Игрок"}
    </div>
  `;
}

/* ===== АДМИН ===== */
function renderAdmin() {
  app.innerHTML = `
    <h2>🛠 Админ-панель</h2>

    ${isOwner ? `
      <div class="card">
        👑 Управление админами
        <button onclick="addAdmin()">➕ Назначить</button>
        <button onclick="removeAdmin()">➖ Снять</button>
      </div>
    ` : ""}

    <div class="card">
      🔧 Админ-функции (будут подключены)
    </div>
  `;
}

function addAdmin() {
  const id = Number(prompt("ID пользователя"));
  if (!ADMIN_IDS.includes(id)) ADMIN_IDS.push(id);
  alert("Админ добавлен");
}

function removeAdmin() {
  const id = Number(prompt("ID пользователя"));
  ADMIN_IDS = ADMIN_IDS.filter(x => x !== id);
  alert("Админ снят");
}

/* ===== СТАРТ ===== */
renderHome();
