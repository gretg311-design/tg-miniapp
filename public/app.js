console.log("✅ app.js loaded");

const OWNER_ID = 8287041036;

let tg = null;

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const screenContent = document.getElementById("screen-content");

const adminBtn = document.getElementById("adminBtn");
const consoleBtn = document.getElementById("consoleBtn");

/* ---------- SAFE INIT ---------- */
function waitTelegram() {
  if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    initApp();
  } else {
    setTimeout(waitTelegram, 100);
  }
}

function getLang() {
  const lang = tg?.initDataUnsafe?.user?.language_code;
  if (lang === "uk") return "ua";
  if (lang === "ru") return "ru";
  return "en";
}

function initApp() {
  try {
    tg.ready();

    const user = tg.initDataUnsafe?.user;
    if (!user) throw new Error("No user data");

    const userId = user.id;

    // Owner / Admin buttons
    if (userId === OWNER_ID) {
      adminBtn.classList.remove("hidden");
      consoleBtn.classList.remove("hidden");
    }

    // УБИРАЕМ LOADER ВСЕГДА
    hideLoader();

    // Навигация
    document.querySelectorAll("[data-screen]").forEach(btn => {
      btn.onclick = () => openScreen(btn.dataset.screen);
    });

  } catch (e) {
    console.error("Init error:", e);
    showSleepMessage();
  }
}

/* ---------- UI ---------- */
function hideLoader() {
  loader.classList.add("hidden");
  app.classList.remove("hidden");
}

function showSleepMessage() {
  document.getElementById("loaderText").innerText =
    "Сервер просыпается…";
  document.getElementById("loaderSub").innerText =
    "Перезайди через 1–1.5 минуты 💙";
}

function openScreen(name) {
  screenContent.innerHTML = `
    <div style="padding:16px">
      <h2>${name}</h2>
      <p>Экран «${name}» (логика будет добавлена)</p>
    </div>
  `;
}

/* ---------- FORCE FAILSAFE ---------- */
// если через 8 секунд всё ещё loader — показываем сообщение
setTimeout(() => {
  if (!app.classList.contains("hidden")) return;
  showSleepMessage();
}, 8000);

/* ---------- START ---------- */
waitTelegram();
