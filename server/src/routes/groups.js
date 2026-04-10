// src/routes/groups.js
const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const supabase = require("../db");
const { requireAuth } = require("../middleware/jwt");
const { sendToUser }  = require("../ws");
const router   = express.Router();

// --- Multer для групових аватарів ---
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const groupAvatarDir = path.join(UPLOAD_DIR, "group_avatars");
fs.mkdirSync(groupAvatarDir, { recursive: true });

const groupAvatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, groupAvatarDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `group_${req.params.slug}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Дозволені: JPG, PNG, WEBP, GIF"));
  },
});

// GET /api/groups — мої групи
router.get("/", requireAuth, async (req, res) => {
  const { data: members } = await supabase
    .from("room_members")
    .select("room_id, role, rooms(*)")
    .eq("user_id", req.userId);

  const groups = (members || []).map((m) => ({
    ...m.rooms,
    my_role: m.role,
  }));
  res.json(groups);
});

// POST /api/groups — створити групу
router.post("/", requireAuth, async (req, res) => {
  const { name, description, is_public, members } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Назва обов'язкова" });

  const slug = name.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яіїє-]/gu, "")
    .slice(0, 40) + "-" + Date.now().toString(36);

  const { data: group, error } = await supabase
    .from("rooms")
    .insert({ slug, name: name.trim(), description: description || "", owner_id: req.userId, is_public: is_public !== false })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  const inserts = [{ room_id: group.id, user_id: req.userId, role: "owner" }];
  const invitedArr = [];

  if (Array.isArray(members) && members.length > 0) {
    const { data: invitedUsers } = await supabase
      .from("users")
      .select("id")
      .in("id", members.filter((id) => id !== req.userId));

    (invitedUsers || []).forEach((u) => {
      inserts.push({ room_id: group.id, user_id: u.id, role: "member" });
      invitedArr.push(u.id);
    });
  }

  await supabase.from("room_members").insert(inserts);

  const groupData = { ...group, member_count: inserts.length, my_role: "owner" };
  
  // Надсилаємо всім запрошеним
  invitedArr.forEach((uid) => {
    sendToUser(uid, { type: 'room_added', room: { ...group, member_count: inserts.length, my_role: "member" } });
  });

  res.status(201).json(groupData);
});

// POST /api/groups/:slug/invite
router.post("/:slug/invite", requireAuth, async (req, res) => {
  const { data: room } = await supabase.from("rooms").select("*").eq("slug", req.params.slug).single();
  if (!room) return res.status(404).json({ error: "Групу не знайдено" });

  const { nickname } = req.body;
  const { data: target } = await supabase.from("users").select("id, nickname").eq("nickname", nickname).single();
  if (!target) return res.status(404).json({ error: "Користувача не знайдено" });

  const { error } = await supabase.from("room_members")
    .insert({ room_id: room.id, user_id: target.id, role: "member" });

  if (error) return res.status(409).json({ error: `${nickname} вже є учасником` });

  const { count } = await supabase
      .from("room_members")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id);

  sendToUser(target.id, { 
    type: 'room_added', 
    room: { ...room, member_count: count || 0, my_role: "member" } 
  });

  res.json({ message: `${nickname} доданий до групи` });
});

// DELETE /api/groups/:slug/leave
router.delete("/:slug/leave", requireAuth, async (req, res) => {
  const { data: room } = await supabase.from("rooms").select("id").eq("slug", req.params.slug).single();
  if (!room) return res.status(404).json({ error: "Не знайдено" });

  await supabase.from("room_members")
    .delete()
    .eq("room_id", room.id)
    .eq("user_id", req.userId);

  res.json({ message: "Покинув групу" });
});

// POST /api/groups/:slug/avatar — завантаження аватара групи
router.post("/:slug/avatar", requireAuth, (req, res) => {
  groupAvatarUpload.single("avatar")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не завантажено" });

    const { data: room } = await supabase.from("rooms").select("*").eq("slug", req.params.slug).single();
    if (!room) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: "Групу не знайдено" });
    }

    if (room.owner_id !== req.userId) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: "Тільки власник може змінювати аватар" });
    }

    const avatarUrl = `/uploads/group_avatars/${req.file.filename}`;

    const { data, error } = await supabase
      .from("rooms")
      .update({ avatar: avatarUrl })
      .eq("id", room.id)
      .select()
      .single();

    if (error) {
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({ error: error.message });
    }

    // Сповіщаємо учасників
    const { data: members } = await supabase.from("room_members").select("user_id").eq("room_id", room.id);
    if (members) {
      members.forEach((m) => {
        sendToUser(m.user_id, { 
          type: "room_updated", 
          room: { ...data, slug: room.slug } // Включаємо slug для ідентифікації на фронті
        });
      });
    }

    res.json({ room: data });
  });
});

module.exports = router;
