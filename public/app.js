const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

/* 🔥 ГЛАВНОЕ — СООБЩАЕМ РЕАЛЬНУЮ ВЫСОТУ */
function fixHeight() {
  document.documentElement.style.height = tg.viewportHeight + "px";
  document.body.style.height = tg.viewportHeight + "px";
}

fixHeight();
tg.onEvent("viewportChanged", fixHeight);

/* ===== ОВНЕР ===== */
const OWNER_ID = 8287041036;
const userId = tg.initDataUnsafe.user?.id;

/* ===== ЭКРАН ===== */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ===== КНОПКИ ОВНЕРА ===== */
if (userId === OWNER_ID) {
  document.getElementById("btn-console").style.display = "flex";
  document.getElementById("btn-admin").style.display = "flex";
}
