// src/ws.js — WebSocket з Supabase
const WebSocket = require("ws");
const jwt       = require("jsonwebtoken");
const supabase  = require("./db");

const clients = new Map(); // ws → { userId, nickname, roomId, roomSlug }

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.set(ws, { userId: null, nickname: null, roomId: null, roomSlug: null });
    sendTo(ws, { type: "need_auth" });

    ws.on("message", async (raw) => {
      let data;
      try { data = JSON.parse(raw.toString()); } catch {
        sendTo(ws, { type: "error", text: "Невалідний JSON" }); return;
      }

      const info = clients.get(ws);
      if (!info.userId && data.type !== "auth") {
        sendTo(ws, { type: "error", text: "Спочатку авторизуйся", code: "NEED_AUTH" }); return;
      }

      const handler = handlers[data.type];
      if (handler) await handler(ws, data, info);
      else sendTo(ws, { type: "error", text: `Невідома подія: ${data.type}` });
    });

    ws.on("close", async () => {
      const info = clients.get(ws);
      if (info?.roomId) leaveRoom(ws, info);
      if (info?.userId) {
        await supabase.from("users").update({ status: "offline" }).eq("id", info.userId);
        console.log(`[-] ${info.nickname} відключився`);
      }
      clients.delete(ws);
    });

    ws.on("error", (e) => console.error("[WS]", e.message));
  });

  return wss;
}

const handlers = {

  // ── Авторизація через JWT ──────────────────────────────────
  async auth(ws, data, info) {
    const { token } = data;
    if (!token) { sendTo(ws, { type: "error", text: "Токен відсутній" }); return; }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch {
      sendTo(ws, { type: "error", text: "Невалідний токен", code: "INVALID_TOKEN" }); return;
    }

    const { data: user } = await supabase
      .from("users").select("*").eq("id", payload.userId).single();
    if (!user) { sendTo(ws, { type: "error", text: "Юзер не знайдений" }); return; }

    info.userId   = user.id;
    info.nickname = user.nickname;

    await supabase.from("users").update({ status: "online" }).eq("id", user.id);

    // Кімнати де є юзер
    const { data: memberOf } = await supabase
      .from("room_members")
      .select("role, rooms(*)")
      .eq("user_id", user.id);

    const rooms = await Promise.all((memberOf || []).map(async (m) => {
      const r = m.rooms;
      let name = r.name;
      let avatar = r.avatar;

      if (r.name === "DM" && !r.is_public) {
        const { data: dmMembers } = await supabase.from("room_members").select("user_id").eq("room_id", r.id);
        const otherUserId = dmMembers?.find(dm => dm.user_id !== user.id)?.user_id;
        if (otherUserId) {
          const { data: otherUser } = await supabase.from("users").select("display_name, nickname, avatar").eq("id", otherUserId).single();
          if (otherUser) {
            name = otherUser.display_name || otherUser.nickname;
            avatar = otherUser.avatar;
          }
        }
      }

      return {
        ...r, my_role: m.role, member_count: 0, name, avatar,
      };
    }));

    sendTo(ws, {
      type: "auth_ok",
      user: {
        id: user.id, nickname: user.nickname,
        display_name: user.display_name,
        avatar: user.avatar, status: user.status,
      },
      rooms,
    });

    console.log(`[+] ${user.nickname} підключився`);
  },

  // ── Вхід у кімнату ─────────────────────────────────────────
  async join_room(ws, data, info) {
    const { data: room } = await supabase
      .from("rooms").select("*").eq("slug", data.roomSlug).single();
    if (!room) { sendTo(ws, { type: "error", text: "Кімната не знайдена" }); return; }

    // Перевіряємо членство
    const { data: member } = await supabase
      .from("room_members")
      .select("*").eq("room_id", room.id).eq("user_id", info.userId).single();
    if (!member) { sendTo(ws, { type: "error", text: "Ти не є учасником" }); return; }

    if (info.roomId) leaveRoom(ws, info);

    info.roomId   = room.id;
    info.roomSlug = room.slug;

    // Останні 50 повідомлень
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, users(nickname, display_name, avatar)")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const messages = (msgs || []).reverse().map((m) => ({
      ...m,
      nickname: m.users?.nickname,
      display_name: m.users?.display_name,
      avatar: m.users?.avatar,
    }));

    let mappedName = room.name;
    let mappedAvatar = room.avatar;
    if (room.name === "DM" && !room.is_public) {
      const { data: dmMembers } = await supabase.from("room_members").select("user_id").eq("room_id", room.id);
      const otherUserId = dmMembers?.find(dm => dm.user_id !== info.userId)?.user_id;
      if (otherUserId) {
        const { data: otherUser } = await supabase.from("users").select("display_name, nickname, avatar").eq("id", otherUserId).single();
        if (otherUser) {
          mappedName = otherUser.display_name || otherUser.nickname;
          mappedAvatar = otherUser.avatar;
        }
      }
    }

    sendTo(ws, {
      type: "room_joined",
      room: { 
        id: room.id, 
        slug: room.slug, 
        name: mappedName, 
        avatar: mappedAvatar,
        my_role: member.role
      },
      messages,
      onlineUsers: getOnlineUsers(room.id),
    });

    broadcastRoom(room.id, {
      type: "user_joined",
      userId: info.userId,
      nickname: info.nickname,
      onlineUsers: getOnlineUsers(room.id),
    }, ws);

    console.log(`[room] ${info.nickname} → #${room.slug}`);
  },

  // ── Повідомлення ───────────────────────────────────────────
  async message(ws, data, info) {
    if (!info.roomId) { sendTo(ws, { type: "error", text: "Ти не в кімнаті" }); return; }
    const text = (data.text || "").trim().slice(0, 2000);
    if (!text) return;

    const { data: saved } = await supabase
      .from("messages")
      .insert({ room_id: info.roomId, user_id: info.userId, type: "text", content: text })
      .select().single();

    const { data: user } = await supabase
      .from("users").select("nickname, display_name, avatar").eq("id", info.userId).single();

    const msg = {
      type: "message",
      id: saved.id,
      room_id: info.roomId,
      user_id: info.userId,
      nickname: user?.nickname,
      display_name: user?.display_name,
      avatar: user?.avatar,
      content: text,
      created_at: saved.created_at,
    };

    broadcastRoomAll(info.roomId, msg);
    console.log(`[msg] #${info.roomSlug} | ${info.nickname}: ${text.slice(0, 60)}`);
  },

  async set_status(ws, data, info) {
    const allowed = ["online", "away", "busy"];
    if (!allowed.includes(data.status)) return;
    await supabase.from("users").update({ status: data.status }).eq("id", info.userId);
    sendTo(ws, { type: "status_updated", status: data.status });
  },

  // ── Стікер (НЕ зберігається у БД — тільки broadcast) ──────
  async sticker(ws, data, info) {
    if (!info.roomId) { sendTo(ws, { type: "error", text: "Ти не в кімнаті" }); return; }
    if (!data.url) return;

    const { data: user } = await supabase
      .from("users").select("nickname, display_name, avatar").eq("id", info.userId).single();

    const msg = {
      type:     "sticker",
      msg_type: "sticker",
      room_id:  info.roomId,
      user_id:  info.userId,
      nickname: user?.nickname,
      display_name: user?.display_name,
      avatar:   user?.avatar,
      content:  data.url,      // base64 dataUrl стікера
      packName: data.packName || "Стікери",
      packData: data.packData || [],  // всі стікери пакету (base64) для функції "Додати пакет"
      timestamp: Date.now(),
    };

    // Транслюємо всім у кімнаті — БЕЗ збереження у Supabase
    broadcastRoomAll(info.roomId, msg);
    console.log(`[sticker] #${info.roomSlug} | ${info.nickname} → ${data.packName || ""}`);
  },
};


function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcastRoom(roomId, data, except = null) {
  const payload = JSON.stringify(data);
  clients.forEach((info, ws) => {
    if (info.roomId === roomId && ws !== except && ws.readyState === WebSocket.OPEN)
      ws.send(payload);
  });
}

function broadcastRoomAll(roomId, data) {
  broadcastRoom(roomId, data, null);
}

function leaveRoom(ws, info) {
  const prevId = info.roomId;
  info.roomId   = null;
  info.roomSlug = null;
  broadcastRoom(prevId, {
    type: "user_left",
    userId: info.userId,
    nickname: info.nickname,
    onlineUsers: getOnlineUsers(prevId),
  }, ws);
}

function getOnlineUsers(roomId) {
  return [...clients.values()]
    .filter((i) => i.roomId === roomId && i.userId)
    .map((i) => ({ userId: i.userId, nickname: i.nickname }));
}

function sendToUser(userId, data) {
  const payload = JSON.stringify(data);
  clients.forEach((info, ws) => {
    if (info.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

module.exports = { setupWebSocket, sendToUser };
