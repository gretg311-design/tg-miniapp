let appStarted = false;

function showAppSafe() {
  if (appStarted) return;
  appStarted = true;

  const loader = document.getElementById('loader');
  const app = document.getElementById('app');

  if (loader) loader.style.display = 'none';
  if (app) app.classList.remove('hidden');

  applyRoles();
}

/* 1️⃣ После загрузки DOM */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(showAppSafe, 800);
});

/* 2️⃣ После полной загрузки */
window.addEventListener('load', () => {
  showAppSafe();
});

/* 3️⃣ Аварийный таймер (если Telegram тупит) */
setTimeout(showAppSafe, 3000);
