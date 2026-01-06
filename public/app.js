console.log("✅ app.js loaded");

const OWNER_ID = 8287041036;

const tg = window.Telegram?.WebApp;
const loader = document.getElementById("loader");
const app = document.getElementById("app");
const screenContent = document.getElementById("screen-content");

const adminBtn = document.getElementById("adminBtn");
const consoleBtn = document.getElementById("consoleBtn");

function getLang() {
  const lang = tg?.initDataUnsafe?.user?.language_code;
  if (lang === "uk") return "ua";
  if (lang === "ru") return "ru";
  return "en";
}

function initApp() {
  if (!tg) {
    alert("Открой через Telegram");
    return;
  }

  tg.ready();

  const userId = tg.initDataUnsafe.user.id;
  const lang = getLang();

  // Owner / Admin visibility
  if (userId === OWNER_ID) {
    adminBtn.classList.remove("hidden");
    consoleBtn.classList.remove("hidden");
  }

  // скрываем загрузку
  setTimeout(() => {
    loader.classList.add("hidden");
    app.classList.remove("hidden");
  }, 1200);

  // кнопки
  document.querySelectorAll("[data-screen]").forEach(btn => {
    btn.onclick = () => openScreen(btn.dataset.screen);
  });
}

function openScreen(name) {
  screenContent.innerHTML = `<div style="padding:16px">
    <h2>${name}</h2>
    <p>Экран «${name}» (заглушка, логика будет добавлена)</p>
  </div>`;
}

initApp();
