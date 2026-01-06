const tg = window.Telegram.WebApp;
tg.expand();

const OWNER_ID = 8287041036;

// ❗ НИКАКИХ await
// ❗ НИКАКИХ fetch
// ❗ НИКАКОГО сервера

function showApp() {
  document.getElementById("loader").remove();
  document.getElementById("app").style.display = "block";
}

// ⛑ ГАРАНТИЯ: интерфейс откроется ВСЕГДА
setTimeout(showApp, 1200);

// Telegram user (может быть undefined — И ЭТО НОРМ)
const user = tg.initDataUnsafe?.user;

if (user) {
  const userId = user.id;

  // Овнер
  if (userId === OWNER_ID) {
    document.getElementById("adminBtn").style.display = "block";
    document.getElementById("consoleBtn").style.display = "block";
  }
}
