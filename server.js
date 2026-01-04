import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/init", (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.json({ ok: false, error: "NO_INIT_DATA" });
  }

  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");

  if (!userRaw) {
    return res.json({ ok: false, error: "NO_USER" });
  }

  const user = JSON.parse(userRaw);

  return res.json({
    ok: true,
    user
  });
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
