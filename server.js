import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db/init.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

await initDB();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server started");
});
