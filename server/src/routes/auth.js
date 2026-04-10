// src/routes/auth.js
require("dotenv").config();
const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const supabase = require("../db");
const { requireAuth } = require("../middleware/jwt");

const router = express.Router();

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_RE = /^[a-zA-Zа-яА-ЯіІїЇєЄ0-9_]{3,30}$/u;

function publicUser(u) {
  return {
    id: u.id, email: u.email, nickname: u.nickname,
    display_name: u.display_name, avatar: u.avatar,
    bio: u.bio, status: u.status, is_verified: u.is_verified,
    created_at: u.created_at,
  };
}

function makeTokens(user) {
  const access = jwt.sign(
    { userId: user.id, nickname: user.nickname },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
  const refresh = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "30d" }
  );
  return { access, refresh };
}

// ── POST /api/auth/register ────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, nickname, display_name } = req.body;

  if (!email || !password || !nickname)
    return res.status(400).json({ error: "Заповни всі поля" });
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ error: "Невалідний email" });
  if (password.length < 8)
    return res.status(400).json({ error: "Пароль мінімум 8 символів" });
  if (!NICKNAME_RE.test(nickname))
    return res.status(400).json({ error: "Нікнейм: 3-30 символів, лише літери, цифри, _" });

  try {
    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase(),
        password_hash,
        nickname,
        display_name: display_name?.trim() || nickname,
        is_verified: true, // Без email верифікації для простоти
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("email"))
        return res.status(409).json({ error: "Email вже зареєстровано" });
      if (error.message.includes("nickname"))
        return res.status(409).json({ error: "Нікнейм вже зайнятий" });
      throw error;
    }

    // Додаємо до публічних кімнат
    const { data: publicRooms } = await supabase
      .from("rooms")
      .select("id")
      .eq("is_public", true);

    if (publicRooms?.length) {
      await supabase.from("room_members").insert(
        publicRooms.map((r) => ({ room_id: r.id, user_id: user.id, role: "member" }))
      );
    }

    const { access, refresh } = makeTokens(user);

    // Зберігаємо refresh токен
    await supabase.from("refresh_tokens").insert({
      user_id: user.id,
      token: refresh,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.status(201).json({
      message: "Реєстрація успішна!",
      accessToken: access,
      refreshToken: refresh,
      user: publicUser(user),
    });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ error: "Помилка сервера: " + err.message });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Введи email та пароль" });

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();

  if (!user) return res.status(401).json({ error: "Невірний email або пароль" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Невірний email або пароль" });

  await supabase.from("users").update({ status: "online" }).eq("id", user.id);

  const { access, refresh } = makeTokens(user);
  await supabase.from("refresh_tokens").insert({
    user_id: user.id,
    token: refresh,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  res.json({ accessToken: access, refreshToken: refresh, user: publicUser(user) });
});

// ── POST /api/auth/refresh ─────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Токен відсутній" });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { data: record } = await supabase
      .from("refresh_tokens")
      .select("*")
      .eq("token", refreshToken)
      .eq("revoked", false)
      .single();

    if (!record) return res.status(401).json({ error: "Токен недійсний" });

    const { data: user } = await supabase
      .from("users").select("*").eq("id", payload.userId).single();

    if (!user) return res.status(401).json({ error: "Юзер не знайдений" });

    const access = jwt.sign(
      { userId: user.id, nickname: user.nickname },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken: access });
  } catch {
    res.status(401).json({ error: "Невалідний токен" });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────
router.post("/logout", requireAuth, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await supabase.from("refresh_tokens")
      .update({ revoked: true })
      .eq("token", refreshToken);
  }
  await supabase.from("users").update({ status: "offline" }).eq("id", req.userId);
  res.json({ message: "Вийшов" });
});

// ── GET /api/auth/me ───────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("*").eq("id", req.userId).single();
  if (!user) return res.status(404).json({ error: "Не знайдено" });
  res.json(publicUser(user));
});

module.exports = router;
module.exports.publicUser = publicUser;
