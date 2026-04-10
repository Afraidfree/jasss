import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MessageList }  from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Status }       from "../hooks/useWebSocket";
import { apiFetch }     from "../hooks/useAuth";
import styles           from "./ChatWindow.module.css";

export function ChatWindow({ 
  messages, status, send, onSendSticker, nickname, displayName, roomName, users,
  currentRoom, currentUserId, onRoomDeleted
}) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const isOnline = status === Status.OPEN;

  const handleDelete = async () => {
    if (!window.confirm(t("chat.confirmDelete") || "Ви впевнені, що хочете видалити/покинути цей чат?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/rooms/${currentRoom.slug}`, { method: "DELETE" });
      onRoomDeleted?.();
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  const handleAvatarClick = () => {
    if (isOwner) fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setUploading(true);
    try {
      const res = await apiFetch(`/groups/${currentRoom.slug}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Помилка завантаження");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка з'єднання");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const isOwner = currentRoom?.my_role === "owner";
  // currentRoom.is_public is false for private groups or DMs.
  const isDM = currentRoom?.name === "DM" || !currentRoom?.is_public;
  
  const headerBtnLabel = isOwner ? (t("chat.deleteChat") || "Видалити чат") : (isDM ? (t("chat.deleteChat") || "Видалити чат") : (t("chat.leaveGroup") || "Покинути"));

  const COLORS = [
    { bg: "#E3F2FF", text: "#1565C0" },
    { bg: "#F3E5F5", text: "#6A1B9A" },
    { bg: "#E8F5E9", text: "#2E7D32" },
    { bg: "#FFF3E0", text: "#E65100" },
    { bg: "#FCE4EC", text: "#880E4F" },
  ];
  const colorFor = (id) => COLORS[String(id).charCodeAt(0) % COLORS.length];
  const color = currentRoom ? colorFor(currentRoom.id) : { bg: "var(--accent)", text: "#fff" };

  return (
    <div className={styles.window}>
      <header className={styles.header}>
        <div 
          className={`${styles.avatarContainer} ${isOwner ? styles.ownerAvatar : ""}`}
          onClick={handleAvatarClick}
        >
          {currentRoom?.avatar ? (
            <img 
              src={currentRoom.avatar} 
              alt="Avatar" 
              className={styles.roomAvatar} 
              style={{ objectFit: "cover" }} 
            />
          ) : (
            <div className={styles.roomAvatar} style={{ background: color.bg, color: color.text }}>
              {roomName?.[0]?.toUpperCase()}
            </div>
          )}
          {isOwner && (
            <div className={styles.avatarOverlay}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          )}
          {uploading && <div className={styles.uploadSpinner} />}
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{!currentRoom?.is_public ? "" : "# "}{roomName}</div>
          <div className={styles.sub}>
            {isOnline
              ? users.length > 0 ? `${users.length} ${t("chat.online")}` : t("profile.statusOnline")
              : t("chat.connecting")}
          </div>
        </div>
        <div className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`} />
        
        {currentRoom && (
          <button 
            onClick={handleDelete}
            disabled={deleting}
            style={{ 
              marginLeft: "10px", 
              background: "transparent", 
              border: "1.5px solid var(--border-color)", 
              padding: "6px 12px", 
              borderRadius: "8px", 
              color: "var(--text-secondary)", 
              cursor: "pointer", 
              fontSize: "13px", 
              fontFamily: "inherit",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = "#E53935"; e.currentTarget.style.borderColor = "#E53935"; }}
            onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
          >
            {deleting ? "..." : headerBtnLabel}
          </button>
        )}
      </header>

      <MessageList messages={messages} currentNickname={nickname} />

      <MessageInput
        onSend={send}
        onSendSticker={onSendSticker}
        disabled={!isOnline}
      />
    </div>
  );
}
