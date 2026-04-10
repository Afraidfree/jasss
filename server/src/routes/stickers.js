// src/routes/stickers.js
// GET  /api/stickers/packs          — мої пакети + публічні
// POST /api/stickers/packs          — створити пакет
// POST /api/stickers/packs/:id      — додати стікер до пакету
// DELETE /api/stickers/:id          — видалити стікер
// DELETE /api/stickers/packs/:id    — видалити пакет

const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const supabase = require("../db");
const { requireAuth } = require("../middleware/jwt");

const router = express.Router();

// ── Multer для стікерів ───────────────────────────────────────
const UPLOAD_DIR  = process.env.UPLOAD_DIR || "./uploads";
const stickerDir  = path.join(UPLOAD_DIR, "stickers");
fs.mkdirSync(stickerDir, { recursive: true });

const stickerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, stickerDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `sticker_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Дозволені: JPG, PNG, WEBP, GIF"));
  },
});

// ══════════════════════════════════════════════════════════════
// GET /api/stickers/packs — мої пакети
// ══════════════════════════════════════════════════════════════
router.get("/packs", requireAuth, async (req, res) => {
  const { data: packs, error } = await supabase
    .from("sticker_packs")
    .select("*, stickers(*)")
    .eq("owner_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(packs || []);
});

// ══════════════════════════════════════════════════════════════
// POST /api/stickers/packs — створити пакет
// ══════════════════════════════════════════════════════════════
router.post("/packs", requireAuth, async (req, res) => {
  const { name, is_public } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Назва обов'язкова" });

  const { data, error } = await supabase
    .from("sticker_packs")
    .insert({
      name:      name.trim().slice(0, 40),
      owner_id:  req.userId,
      is_public: is_public === true,
    })
    .select("*, stickers(*)")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ══════════════════════════════════════════════════════════════
// POST /api/stickers/packs/:packId — додати стікер (завантажити файл)
// ══════════════════════════════════════════════════════════════
router.post("/packs/:packId", requireAuth, (req, res) => {
  stickerUpload.single("sticker")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не завантажено" });

    const packId = parseInt(req.params.packId);

    // Перевіряємо що пакет належить юзеру
    const { data: pack } = await supabase
      .from("sticker_packs")
      .select("id")
      .eq("id", packId)
      .eq("owner_id", req.userId)
      .single();

    if (!pack) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: "Немає доступу до цього пакету" });
    }

    const url = `/uploads/stickers/${req.file.filename}`;
    const emoji = req.body.emoji || "😊";

    const { data: sticker, error } = await supabase
      .from("stickers")
      .insert({ pack_id: packId, url, emoji })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(sticker);
  });
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/stickers/packs/:packId — видалити пакет
// ══════════════════════════════════════════════════════════════
router.delete("/packs/:packId", requireAuth, async (req, res) => {
  const packId = parseInt(req.params.packId);

  // Перевіряємо права
  const { data: pack } = await supabase
    .from("sticker_packs")
    .select("id")
    .eq("id", packId)
    .eq("owner_id", req.userId)
    .single();

  if (!pack) return res.status(403).json({ error: "Немає доступу" });

  // Видаляємо файли стікерів
  const { data: stickers } = await supabase
    .from("stickers")
    .select("url")
    .eq("pack_id", packId);

  (stickers || []).forEach((s) => {
    const filePath = path.join(UPLOAD_DIR, s.url.replace("/uploads/", ""));
    fs.unlink(filePath, () => {});
  });

  await supabase.from("sticker_packs").delete().eq("id", packId);
  res.json({ message: "Пакет видалено" });
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/stickers/:stickerId — видалити один стікер
// ══════════════════════════════════════════════════════════════
router.delete("/:stickerId", requireAuth, async (req, res) => {
  const stickerId = parseInt(req.params.stickerId);

  // Знаходимо стікер і перевіряємо права через pack
  const { data: sticker } = await supabase
    .from("stickers")
    .select("*, sticker_packs(owner_id)")
    .eq("id", stickerId)
    .single();

  if (!sticker) return res.status(404).json({ error: "Стікер не знайдено" });
  if (sticker.sticker_packs?.owner_id !== req.userId)
    return res.status(403).json({ error: "Немає доступу" });

  // Видаляємо файл
  const filePath = path.join(UPLOAD_DIR, sticker.url.replace("/uploads/", ""));
  fs.unlink(filePath, () => {});

  await supabase.from("stickers").delete().eq("id", stickerId);
  res.json({ message: "Стікер видалено" });
});

module.exports = router;
