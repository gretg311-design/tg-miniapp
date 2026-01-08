const tg = window.Telegram.WebApp;
tg.ready();

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const screen = document.getElementById("screen");

fetch("/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ initData: tg.initData })
})
.then(r => r.json())
.then(data => {
  loader.classList.add("hidden");
  app.classList.remove("hidden");

  if (data.isOwner) {
    document.getElementById("consoleBtn").classList.remove("hidden");
    document.getElementById("adminBtn").classList.remove("hidden");
  }
})
.catch(() => {
  loader.querySelector("p").innerText =
    "Сервер просыпается...\nПерезайдите через 1 минуту";
});

function openScreen(name) {
  screen.innerHTML = `<h3>${name}</h3><p>Экран в разработке</p>`;
}
