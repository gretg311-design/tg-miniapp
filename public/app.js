const app = document.getElementById("app");

if (!window.Telegram || !Telegram.WebApp) {
  app.innerHTML = "<h3>❌ Открой через Telegram</h3>";
  throw new Error("Not Telegram");
}

const tg = Telegram.WebApp;
tg.ready();
tg.expand();

const user = tg.initDataUnsafe?.user;

if (!user?.id) {
  app.innerHTML = "<h3>❌ Ошибка авторизации</h3>";
  throw new Error("No user");
}

// 👇 временные данные (ПОКА БЕЗ БД)
const state = {
  id: user.id,
  balance: 0,
  shards: 0,
  premium: false
};

renderMain();

function renderMain() {
  app.innerHTML = `
    <div style="padding:20px; width:100%; max-width:420px">

      <h2 style="text-align:center;">🌙 Anime AI</h2>

      <div class="card">
        <div>🆔 ID: ${state.id}</div>
        <div>💎 Лунные осколки: ${state.shards}</div>
        <div>💰 Баланс: ${state.balance}</div>
        <div>⭐ Премиум: ${state.premium ? "Да" : "Нет"}</div>
      </div>

      <button onclick="daily()">🎁 Ежедневная награда</button>
      <button onclick="characters()">👥 Персонажи</button>
      <button onclick="chats()">💬 Чаты</button>
      <button onclick="shop()">🛒 Магазин</button>
      <button onclick="profile()">⚙️ Профиль</button>

    </div>
  `;
}

// ====== заглушки ======
function daily() {
  alert("🎁 Ежедневка (скоро)");
}
function characters() {
  alert("👥 Персонажи (скоро)");
}
function chats() {
  alert("💬 Чаты (скоро)");
}
function shop() {
  alert("🛒 Магазин осколков (скоро)");
}
function profile() {
  alert("⚙️ Профиль (скоро)");
}
