// src/routes/rooms.js
const express  = require("express");
const supabase = require("../db");
const { requireAuth } = require("../middleware/jwt");
const { sendToUser }  = require("../ws");
const router   = express.Router();

// GET /api/rooms
router.get("/", requireAuth, async (req, res) => {
  const { data: members } = await supabase
    .from("room_members")
    .select("room_id, role")
    .eq("user_id", req.userId);

  const myRoomIds = members?.map((m) => m.room_id) || [];

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .or(`is_public.eq.true,id.in.(${myRoomIds.join(",") || "0"})`);

  const result = await Promise.all((rooms || []).map(async (r) => {
    const { data: allMembers, count } = await supabase
      .from("room_members")
      .select("user_id", { count: "exact" })
      .eq("room_id", r.id);
      
    const myRole = members?.find((m) => m.room_id === r.id)?.role || null;
    let name = r.name;
    let avatar = r.avatar;

    // Якщо це DM, знайдемо співрозмовника
    if (r.name === "DM" && !r.is_public && myRole) {
      const otherUserIds = (allMembers || []).filter(m => m.user_id !== req.userId).map(m => m.user_id);
      if (otherUserIds.length > 0) {
        const { data: otherUser } = await supabase
          .from("users")
          .select("display_name, nickname, avatar")
          .eq("id", otherUserIds[0])
          .single();
        if (otherUser) {
          name = otherUser.display_name || otherUser.nickname;
          avatar = otherUser.avatar;
        }
      }
    }

    return { ...r, name, avatar, member_count: count || 0, my_role: myRole };
  }));

  res.json(result);
});

// POST /api/rooms
router.post("/", requireAuth, async (req, res) => {
  const { name, description, is_public } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Назва обов'язкова" });

  const slug = name.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яіїє-]/gu, "")
    .slice(0, 40) + "-" + Date.now().toString(36);

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({ slug, name: name.trim(), description: description || "", owner_id: req.userId, is_public: is_public !== false })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("room_members").insert({ room_id: room.id, user_id: req.userId, role: "owner" });

  res.status(201).json({ ...room, member_count: 1, my_role: "owner" });
});

// POST /api/rooms/dm/:targetId
router.post("/dm/:targetId", requireAuth, async (req, res) => {
  if (req.userId === req.params.targetId) return res.status(400).json({ error: "Can't DM yourself" });

  const slugParams = [req.userId, req.params.targetId].sort();
  const slug = `dm-${slugParams[0]}-${slugParams[1]}`;

  const { data: targetUser } = await supabase.from("users").select("display_name, nickname, avatar").eq("id", req.params.targetId).single();
  const { data: selfUser } = await supabase.from("users").select("display_name, nickname, avatar").eq("id", req.userId).single();

  const { data: existing } = await supabase.from("rooms").select("*").eq("slug", slug).single();
  if (existing) {
    return res.json({ 
      ...existing, 
      name: targetUser?.display_name || targetUser?.nickname || "DM", 
      avatar: targetUser?.avatar, 
      my_role: "member",
      member_count: 2 
    });
  }

  const { data: newRoom, error } = await supabase
    .from("rooms")
    .insert({ slug, name: "DM", description: "", owner_id: req.userId, is_public: false })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("room_members").insert([
    { room_id: newRoom.id, user_id: req.userId, role: "member" },
    { room_id: newRoom.id, user_id: req.params.targetId, role: "member" }
  ]);

  // Сповіщення
  sendToUser(req.params.targetId, {
    type: "room_added",
    room: { ...newRoom, name: selfUser.display_name || selfUser.nickname, avatar: selfUser.avatar, member_count: 2, my_role: "member" }
  });

  res.status(201).json({ ...newRoom, name: targetUser.display_name || targetUser.nickname, avatar: targetUser.avatar, member_count: 2, my_role: "member" });
});

// DELETE /api/rooms/:slug
router.delete("/:slug", requireAuth, async (req, res) => {
  const { data: room } = await supabase.from("rooms").select("*").eq("slug", req.params.slug).single();
  if (!room) return res.status(404).json({ error: "Не знайдено" });

  // Перевірка прав (власник або це DM, де обидва учасники мають право видалити)
  if (room.owner_id !== req.userId && room.name !== "DM") {
    // Якщо не власник, то просто "покинути"
    await supabase.from("room_members").delete().eq("room_id", room.id).eq("user_id", req.userId);
    return res.json({ message: "Покинув групу" });
  }

  // Знайти всіх учасників щоб сповістити їх до видалення
  const { data: members } = await supabase.from("room_members").select("user_id").eq("room_id", room.id);

  // Видаляємо кімнату (Supabase каскадно видалить messages та room_members, якщо foreign keys налаштовані правильно, 
  // або ж можемо видалити самі, але для страховки видалимо вручну спочатку members і messages)
  await supabase.from("messages").delete().eq("room_id", room.id);
  await supabase.from("room_members").delete().eq("room_id", room.id);
  await supabase.from("rooms").delete().eq("id", room.id);

  if (members) {
    members.forEach(m => {
      sendToUser(m.user_id, { type: "room_deleted", slug: room.slug });
    });
  }

  res.json({ message: "Видалено" });
});

// GET /api/rooms/:slug/messages
router.get("/:slug/messages", requireAuth, async (req, res) => {
  const { data: room } = await supabase.from("rooms").select("id").eq("slug", req.params.slug).single();
  if (!room) return res.status(404).json({ error: "Не знайдено" });

  const { data: messages } = await supabase
    .from("messages")
    .select("*, users(nickname, display_name, avatar)")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(50);

  res.json((messages || []).reverse().map((m) => ({
    ...m,
    nickname: m.users?.nickname,
    display_name: m.users?.display_name,
    avatar: m.users?.avatar,
  })));
});

// POST /api/rooms/:slug/join
router.post("/:slug/join", requireAuth, async (req, res) => {
  const { data: room } = await supabase.from("rooms").select("*").eq("slug", req.params.slug).single();
  if (!room) return res.status(404).json({ error: "Не знайдено" });
  if (!room.is_public) return res.status(403).json({ error: "Приватна кімната" });

  await supabase.from("room_members")
    .upsert({ room_id: room.id, user_id: req.userId, role: "member" }, { onConflict: "room_id,user_id" });

  res.json({ message: "Приєднався" });
});

module.exports = router;
