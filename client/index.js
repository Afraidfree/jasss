require("dotenv").config();

const http    = require("http");
const express = require("express");
const cors    = require("cors");
const path    = require("path");

require("./db/migrate");

const authRouter    = require("./routes/auth");
const profileRouter = require("./routes/profile");
const roomsRouter   = require("./routes/rooms");
const groupsRouter  = require("./routes/groups");
const usersRouter   = require("./routes/users");
const { setupWebSocket } = require("./ws");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

app.use("/api/auth",    authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/rooms",   roomsRouter);
app.use("/api/groups",  groupsRouter);
app.use("/api/users",   usersRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/*", (req, res) => res.status(404).json({ error: "Маршрут не знайдений" }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "Помилка сервера" }); });

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 Сервер: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`\n📋 API маршрути:`);
  console.log(`   /api/auth/*    — авторизація`);
  console.log(`   /api/groups/*  — групи`);
  console.log(`   /api/users/*   — пошук юзерів`);
  console.log(`   /api/rooms/*   — публічні кімнати`);
  console.log(`   /api/profile/* — профіль\n`);
});
