import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* === ВАЖНО: static ДОЛЖЕН БЫТЬ ВЫШЕ ВСЕГО === */
app.use(express.static(path.join(__dirname, "public")));

/* === health check === */
app.get("/health", (req, res) => {
  res.send("OK");
});

/* === fallback ТОЛЬКО для главной === */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("🚀 Server started on port", PORT);
});
