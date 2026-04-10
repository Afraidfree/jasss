import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./RoomList.module.css";

export function RoomList({
  rooms, currentRoom, users,
  nickname, avatar,
  onJoin, onLogout,
  onNewGroup, onSearchUsers,
  onEditProfile, onSettings,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const letter = (s) => s?.[0]?.toUpperCase() || "?";

  const COLORS = [
    { bg: "#E3F2FF", text: "#1565C0" },
    { bg: "#F3E5F5", text: "#6A1B9A" },
    { bg: "#E8F5E9", text: "#2E7D32" },
    { bg: "#FFF3E0", text: "#E65100" },
    { bg: "#FCE4EC", text: "#880E4F" },
  ];
  const colorFor = (id) => COLORS[String(id).charCodeAt(0) % COLORS.length];

  return (
    <aside className={styles.sidebar}>

      {/* Шапка */}
      <div className={styles.header}>
        <div className={styles.me}>
          <div
            className={styles.myAvatarWrap}
            onClick={onEditProfile}
            title={t("settings.editProfile")}
          >
            {avatar
              ? <img className={styles.myAvatar} src={avatar} alt="" />
              : <div className={styles.myAvatar}>{letter(nickname)}</div>
            }
            <div className={styles.editOverlay}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          </div>

          <span className={styles.myName}>{nickname}</span>

          <button className={styles.iconBtn} onClick={onSettings} title={t("settings.title")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button className={styles.iconBtn} onClick={onLogout} title={t("chat.logout")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Кнопки дій */}
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={onSearchUsers}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            {t("chat.searchUsers")}
          </button>
          <button className={styles.actionBtn} onClick={onNewGroup}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t("chat.newGroup")}
          </button>
        </div>

        {/* Пошук */}
        <div className={styles.searchBox}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder={t("chat.searchRooms")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Список кімнат */}
      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            {search ? t("chat.nothingFound") : t("chat.noRooms")}
          </div>
        )}
        {filtered.map((room) => {
          const c = colorFor(room.id);
          const isActive = currentRoom?.id === room.id;
          return (
            <div
              key={room.id}
              className={`${styles.item} ${isActive ? styles.active : ""}`}
              onClick={() => onJoin(room.slug)}
            >
              {room.avatar
                ? <img className={styles.avatar} src={room.avatar} alt="" />
                : <div className={styles.avatar} style={{ background: c.bg, color: c.text }}>
                    {letter(room.name)}
                  </div>
              }
              <div className={styles.info}>
                <div className={styles.name}>{room.name}</div>
                <div className={styles.sub}>
                  {isActive && users.length > 0
                    ? `${users.length} ${t("chat.online")}`
                    : `${room.member_count || 0} ${t("chat.members")}`}
                </div>
              </div>
              {room.my_role === "owner" && (
                <span className={styles.ownerBadge} title={t("chat.owner")}>★</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Онлайн у кімнаті */}
      {currentRoom && users.length > 0 && (
        <div className={styles.onlineSection}>
          <div className={styles.onlineTitle}>Онлайн — {users.length}</div>
          {users.map((u) => (
            <div key={u.userId} className={styles.onlineUser}>
              <span className={styles.onlineDot} />
              {u.nickname}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
