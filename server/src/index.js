require("dotenv").config();
const http     = require("http");
const express  = require("express");
const cors     = require("cors");
const path     = require("path");

const authRouter     = require("./routes/auth");
const profileRouter  = require("./routes/profile");
const roomsRouter    = require("./routes/rooms");
const groupsRouter   = require("./routes/groups");
const usersRouter    = require("./routes/users");
const stickersRouter = require("./routes/stickers");
const { setupWebSocket } = require("./ws");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

app.use("/api/auth",     authRouter);
app.use("/api/profile",  profileRouter);
app.use("/api/rooms",    roomsRouter);
app.use("/api/groups",   groupsRouter);
app.use("/api/users",    usersRouter);
app.use("/api/stickers", stickersRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/*", (req, res) => res.status(404).json({ error: "Не знайдено" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Помилка сервера" });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 Сервер: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🗄  Supabase: ${process.env.SUPABASE_URL}\n`);
});
