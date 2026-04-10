// src/routes/users.js
const express  = require("express");
const supabase = require("../db");
const { requireAuth } = require("../middleware/jwt");
const router   = express.Router();

// GET /api/users/search?q=...
router.get("/search", requireAuth, async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Мінімум 2 символи" });

  const { data } = await supabase
    .from("users")
    .select("id, nickname, display_name, avatar, status, bio")
    .or(`nickname.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq("id", req.userId)
    .limit(20);

  res.json(data || []);
});

// GET /api/users/:nickname
router.get("/:nickname", requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from("users")
    .select("id, nickname, display_name, avatar, status, bio, created_at")
    .eq("nickname", req.params.nickname)
    .single();

  if (!user) return res.status(404).json({ error: "Не знайдено" });
  res.json(user);
});

module.exports = router;
