const tg = window.Telegram.WebApp;
tg.ready();

const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const app = document.getElementById("app");

function showApp() {
  loader.classList.add("hidden");
  app.classList.remove("hidden");
}

// ⏱️ СТРАХОВКА — НИКОГДА НЕ ВИСИМ
setTimeout(() => {
  loaderText.innerText = "Сервер запускается...\nЗайдите снова через 1 минуту";
  showApp();
}, 6000);

fetch("/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ initData: tg.initData })
})
.then(r => r.json())
.then(data => {
  showApp();

  if (data.ok && data.isOwner) {
    document.getElementById("consoleBtn").classList.remove("hidden");
    document.getElementById("adminBtn").classList.remove("hidden");
  }
})
.catch(() => {
  loaderText.innerText =
    "Ошибка сервера.\nПерезайдите через 1 минуту";
  showApp();
});
