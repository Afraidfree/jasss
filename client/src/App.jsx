import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth, apiFetch }   from "./hooks/useAuth";
import { useWebSocket }        from "./hooks/useWebSocket";
import { readPacks }           from "./hooks/useStickerStorage";
import { AuthScreen }          from "./components/AuthScreen";
import { RoomList }            from "./components/RoomList";
import { ChatWindow }          from "./components/ChatWindow";
import { CreateGroupModal }    from "./components/CreateGroupModal";
import { UserSearchPanel }     from "./components/UserSearchPanel";
import { ProfileModal }        from "./components/ProfileModal";
import { SettingsModal }       from "./components/SettingsModal";
import "./App.css";

export default function App() {
  const { t } = useTranslation();
  const { user, loading, error, register, login, logout, updateUser } = useAuth();
  const accessToken = user ? localStorage.getItem("access_token") : null;

  const {
    messages, users, rooms: wsRooms, currentRoom,
    status, send, joinRoom, sendRaw, leaveCurrentRoom
  } = useWebSocket(accessToken, user?.id);

  const [allRooms, setAllRooms]               = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserSearch,  setShowUserSearch]  = useState(false);
  const [showProfile,     setShowProfile]     = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const s = localStorage.getItem("messenger_settings");
      let theme = "light";
      if (s) {
        try {
          const parsed = JSON.parse(s);
          if (parsed.theme) theme = parsed.theme;
          if (parsed.fontSize) {
            const map = { small: "13px", medium: "15px", large: "17px" };
            document.documentElement.style.setProperty("--chat-font-size", map[parsed.fontSize] || "15px");
          }
        } catch (e) {}
      }
      if (theme === "auto") {
        document.documentElement.setAttribute(
          "data-theme",
          window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        );
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
    };

    applyTheme();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme();
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!user || !accessToken) return;
    apiFetch("/rooms")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllRooms(data); })
      .catch(console.error);
  }, [user, accessToken]);

  const mergedRooms = useMemo(() => {
    const map = new Map();
    allRooms.forEach((r) => map.set(r.id, r));
    wsRooms.forEach((r) => map.set(r.id, { ...map.get(r.id), ...r }));
    return Array.from(map.values());
  }, [allRooms, wsRooms]);

  const handleGroupCreated = (group) => {
    setShowCreateGroup(false);
    setAllRooms((prev) => [...prev, group]);
    setTimeout(() => joinRoom(group.slug), 300);
  };

  const handleProfileUpdated = (updated) => {
    updateUser(updated);
    setShowProfile(false);
  };

  const handleSendSticker = useCallback((sticker) => {
    const packs = readPacks();
    const pack  = packs.find((p) => p.id === sticker.packId);
    const packData = pack
      ? pack.stickers.map((s) => ({ dataUrl: s.dataUrl, emoji: s.emoji, name: s.name }))
      : [{ dataUrl: sticker.dataUrl, emoji: sticker.emoji, name: sticker.name }];

    sendRaw?.({
      type:     "sticker",
      url:      sticker.dataUrl,
      emoji:    sticker.emoji,
      packName: pack?.name || t("addSticker"),
      packData,
    });
  }, [sendRaw, t]);

  const handleStartDM = async (userId) => {
    try {
      const res = await apiFetch(`/rooms/dm/${userId}`, { method: "POST" });
      const created = await res.json();
      if (!created.error) {
        setShowUserSearch(false);
        setAllRooms((prev) => {
           if (prev.find(r => r.slug === created.slug)) return prev;
           return [...prev, created];
        });
        setTimeout(() => joinRoom(created.slug), 300);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return <AuthScreen onRegister={register} onLogin={login} loading={loading} error={error} />;
  }

  return (
    <div className="app-layout">
      <RoomList
        rooms={mergedRooms}
        currentRoom={currentRoom}
        users={users}
        nickname={user.display_name || user.nickname}
        avatar={user.avatar}
        onJoin={joinRoom}
        onLogout={logout}
        onNewGroup={() => setShowCreateGroup(true)}
        onSearchUsers={() => setShowUserSearch(true)}
        onEditProfile={() => setShowProfile(true)}
        onSettings={() => setShowSettings(true)}
      />

      {currentRoom ? (
        <ChatWindow
          messages={messages}
          status={status}
          send={send}
          onSendSticker={handleSendSticker}
          nickname={user.nickname}
          displayName={user.display_name}
          roomName={currentRoom.name}
          users={users}
          currentRoom={currentRoom}
          currentUserId={user.id}
          onRoomDeleted={leaveCurrentRoom}
        />
      ) : (
        <div className="no-room">
          <div className="no-room-icon">💬</div>
          <p>{t("chat.selectRoom")}</p>
          <button className="no-room-btn" onClick={() => setShowCreateGroup(true)}>
            + {t("chat.newGroup")}
          </button>
        </div>
      )}

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={handleGroupCreated} />}
      {showUserSearch  && <UserSearchPanel currentUserId={user.id} onClose={() => setShowUserSearch(false)} onStartDM={handleStartDM} />}
      {showProfile     && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdated={handleProfileUpdated} />}
      {showSettings    && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onEditProfile={() => { setShowSettings(false); setShowProfile(true); }}
          onThemeChange={(theme) => {
            if (theme === "auto") {
              document.documentElement.setAttribute(
                "data-theme",
                window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
              );
            } else {
              document.documentElement.setAttribute("data-theme", theme);
            }
          }}
        />
      )}
    </div>
  );
}
