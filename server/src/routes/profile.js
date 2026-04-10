// src/routes/profile.js
const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const supabase = require("../db");
const { requireAuth } = require("../middleware/jwt");
const router   = express.Router();

// ── Multer для аватарів ───────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const avatarDir  = path.join(UPLOAD_DIR, "avatars");
fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar_${req.userId}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Дозволені: JPG, PNG, WEBP, GIF"));
  },
});

// PUT /api/profile — редагування
router.put("/", requireAuth, async (req, res) => {
  const { display_name, bio, nickname } = req.body;
  const updates = {};
  if (display_name !== undefined) updates.display_name = display_name.trim().slice(0, 60);
  if (bio          !== undefined) updates.bio = bio.trim().slice(0, 300);
  if (nickname     !== undefined) updates.nickname = nickname.trim().slice(0, 30);

  if (!Object.keys(updates).length)
    return res.status(400).json({ error: "Нема що оновлювати" });

  const { data, error } = await supabase
    .from("users").update(updates).eq("id", req.userId).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/profile/status
router.put("/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ["online", "away", "busy", "offline"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Невалідний статус" });

  const { data, error } = await supabase
    .from("users").update({ status }).eq("id", req.userId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/profile/avatar — завантаження аватара
router.post("/avatar", requireAuth, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не завантажено" });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const { data, error } = await supabase
      .from("users")
      .update({ avatar: avatarUrl })
      .eq("id", req.userId)
      .select()
      .single();

    if (error) {
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({ error: error.message });
    }

    res.json({ user: data });
  });
});

// GET /api/profile/:nickname
router.get("/:nickname", requireAuth, async (req, res) => {
  const { data } = await supabase
    .from("users")
    .select("id, nickname, display_name, avatar, status, bio, created_at")
    .eq("nickname", req.params.nickname)
    .single();
  if (!data) return res.status(404).json({ error: "Не знайдено" });
  res.json(data);
});

module.exports = router;
