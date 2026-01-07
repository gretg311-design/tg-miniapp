const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const OWNER_ID = 8287041036;
const userId = tg.initDataUnsafe?.user?.id;

/* УБИРАЕМ ЗАГРУЗКУ */
setTimeout(() => {
  document.getElementById("loader").style.display = "none";
  document.getElementById("app").style.display = "block";
}, 1200);

/* ПОКАЗ КНОПОК ОВНЕРА */
if (userId === OWNER_ID) {
  document.getElementById("btn-admin").style.display = "flex";
  document.getElementById("btn-console").style.display = "flex";
}

/* ФИКС ВЫСОТЫ */
function fixHeight() {
  document.body.style.height = tg.viewportHeight + "px";
  document.getElementById("app").style.height = tg.viewportHeight + "px";
}
fixHeight();
tg.onEvent("viewportChanged", fixHeight);
