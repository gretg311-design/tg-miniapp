console.log("🔥 app.js loaded");

const status = document.getElementById("status");

if (!window.Telegram || !Telegram.WebApp) {
  status.innerText = "❌ Не Telegram среда";
} else {
  const tg = Telegram.WebApp;
  tg.ready();

  const user = tg.initDataUnsafe.user;

  status.innerText =
    "✅ Telegram OK\n" +
    "User ID: " + (user?.id || "нет");

  if (user) {
    fetch("/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        console.log("✅ User saved");
      })
      .catch((e) => {
        console.error("❌ Save error", e);
      });
  }
}
