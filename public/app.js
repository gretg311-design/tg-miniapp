console.log("🔥 app.js loaded");

const loading = document.getElementById("loading");
const main = document.getElementById("main");
const noTelegram = document.getElementById("noTelegram");

const balanceEl = document.getElementById("balance");
const subEl = document.getElementById("sub");
const adminBtn = document.getElementById("adminBtn");

if (!window.Telegram || !Telegram.WebApp) {
  loading.classList.add("hidden");
  noTelegram.classList.remove("hidden");
} else {
  const tg = Telegram.WebApp;
  tg.ready();

  // серверная проверка
  fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: tg.initData })
  })
    .then(r => r.json())
    .then(data => {
      if (!data.ok) {
        loading.innerHTML = "<p>❌ Ошибка проверки Telegram</p>";
        return;
      }

      // временные данные (позже из БД)
      balanceEl.innerText = data.balance ?? 50;
      subEl.innerText = data.subscription ?? "Free";

      if (data.isAdmin) {
        adminBtn.classList.remove("hidden");
      }

      loading.classList.add("hidden");
      main.classList.remove("hidden");
    })
    .catch(err => {
      console.error(err);
      loading.innerHTML = "<p>❌ Ошибка сервера</p>";
    });
}
