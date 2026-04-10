import { useEffect, useRef, useState, useCallback } from "react";
import { playNotificationSound } from "../utils/sound";

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

export const Status = {
  CONNECTING: "connecting",
  OPEN:       "open",
  CLOSED:     "closed",
  ERROR:      "error",
};

export function useWebSocket(accessToken, currentUserId) {
  const [messages, setMessages]       = useState([]);
  const [users, setUsers]             = useState([]);
  const [rooms, setRooms]             = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [status, setStatus]           = useState(Status.CONNECTING);

  const socketRef      = useRef(null);
  const reconnectTimer = useRef(null);
  const tokenRef       = useRef(accessToken);
  const userIdRef      = useRef(currentUserId);

  // Оновлюємо refs коли залежності змінюються
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);
  useEffect(() => { userIdRef.current = currentUserId; }, [currentUserId]);

  const addMsg = useCallback((msg) => {
    setMessages((prev) => [...prev, { ...msg, _key: Math.random() }]);
  }, []);

  const handleEvent = useCallback((data) => {
    switch (data.type) {

      case "need_auth":
        // Надсилаємо токен одразу після підключення
        if (tokenRef.current) {
          socketRef.current?.send(JSON.stringify({
            type: "auth",
            token: tokenRef.current,
          }));
        }
        break;

      case "auth_ok":
        setRooms(data.rooms || []);
        break;

      case "room_joined":
        setCurrentRoom(data.room);
        setMessages((data.messages || []).map((m) => ({ ...m, _key: Math.random() })));
        setUsers(data.onlineUsers || []);
        break;

      case "message":
      case "sticker":
        addMsg(data);
        if (data.user_id && data.user_id !== userIdRef.current) {
          try {
            const raw = localStorage.getItem("messenger_settings");
            let settings = { notifications: true, sound: true, soundVolume: 80 };
            try {
              if (raw) settings = { ...settings, ...JSON.parse(raw) };
            } catch(e) {}
            
            if (settings.sound !== false) {
              playNotificationSound(settings.soundVolume ?? 80);
            }

            if (settings.notifications !== false && "Notification" in window) {
              if (Notification.permission === "granted") {
                const title = data.nickname || data.display_name || "Нове повідомлення";
                const isSticker = data.type === "sticker" || data.msg_type === "sticker";
                const body = isSticker ? "Надіслав(-ла) стікер" : data.text;
                new Notification(title, {
                  body,
                  icon: data.avatar || "/vite.svg"
                });
              }
            }
          } catch (e) {
            console.error("Помилка сповіщення:", e);
          }
        }
        break;

      case "system":
        addMsg(data);
        break;

      case "error":
        console.error("[WS error]", data.text);
        addMsg({ type: "error", text: data.text, timestamp: Date.now() });
        break;

      case "user_joined":
        setUsers(data.onlineUsers || []);
        addMsg({
          type: "system",
          text: `${data.nickname} приєднався`,
          timestamp: Date.now(),
        });
        break;

      case "user_left":
        setUsers(data.onlineUsers || []);
        addMsg({
          type: "system",
          text: `${data.nickname} вийшов`,
          timestamp: Date.now(),
        });
        break;

      case "status_updated":
        break;

      case "room_added":
        setRooms((prev) => {
          if (prev.find(r => r.id === data.room.id)) return prev;
          return [...prev, data.room];
        });
        break;

      case "room_deleted":
        setRooms((prev) => prev.filter(r => r.slug !== data.slug));
        setCurrentRoom((prev) => prev?.slug === data.slug ? null : prev);
        break;

      case "room_updated":
        setRooms((prev) => prev.map(r => (r.id === data.room.id ? { ...r, ...data.room } : r)));
        setCurrentRoom((prev) => (prev?.id === data.room.id ? { ...prev, ...data.room } : prev));
        break;

      default:
        break;
    }
  }, [addMsg]);

  const connect = useCallback(() => {
    if (!tokenRef.current) return;
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
    }
    setStatus(Status.CONNECTING);
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setStatus(Status.OPEN);
      clearTimeout(reconnectTimer.current);
      console.log("[WS] Підключено");
    };

    ws.onmessage = (e) => {
      try { handleEvent(JSON.parse(e.data)); } catch (err) {
        console.error("[WS parse error]", err);
      }
    };

    ws.onclose = () => {
      setStatus(Status.CLOSED);
      console.log("[WS] Відключено, перепідключення через 3с...");
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => setStatus(Status.ERROR);
  }, [handleEvent]);

  useEffect(() => {
    if (!accessToken) return;
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, [connect, accessToken]);

  // Приєднатись до кімнати по slug
  const joinRoom = useCallback((roomSlug) => {
    if (!roomSlug) return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Не підключено, joinRoom відкладено");
      return;
    }
    console.log("[WS] joinRoom →", roomSlug);
    socketRef.current.send(JSON.stringify({
      type: "join_room",
      roomSlug: roomSlug,
    }));
  }, []);

  // Надіслати повідомлення
  const send = useCallback((text) => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "message", text: trimmed }));
  }, []);

  const sendRaw = useCallback((data) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify(data));
  }, []);

  return { messages, users, rooms, currentRoom, status, send, joinRoom, sendRaw, leaveCurrentRoom: () => setCurrentRoom(null) };
}

// sendRaw додається окремим експортом через патч
