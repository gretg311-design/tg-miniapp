import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// === paths ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === LOG EVERY REQUEST ===
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

// === STATIC ===
app.use(express.static(path.join(__dirname, "public")));

// === ROOT (ВАЖНО) ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === API INIT (МИНИАПП ЖДЁТ ЭТО) ===
app.post("/api/init", (req, res) => {
  try {
    console.log("📩 INIT BODY:", req.body);

    res.json({
      ok: true,
      user: {
        id: 1,
        name: "Test User"
      }
    });
  } catch (e) {
    console.error("❌ INIT ERROR:", e);
    res.status(500).json({ ok: false });
  }
});

// === FALLBACK ===
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// === START ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server started on", PORT);
});
