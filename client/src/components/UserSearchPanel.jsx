// src/components/UserSearchPanel.jsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../hooks/useAuth";
import styles from "./UserSearchPanel.module.css";

export function UserSearchPanel({ currentUserId, onClose, onStartDM }) {
  const { t } = useTranslation();
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef(null);

  const STATUS_COLOR = { online: "#43A047", away: "#FB8C00", busy: "#E53935", offline: "#bbb" };
  const STATUS_LABEL = { 
    online: t("profile.statusOnline"), 
    away: t("profile.statusAway"), 
    busy: t("profile.statusDnd"), 
    offline: t("profile.statusOffline") 
  };

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {}
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>

        <div className={styles.header}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder={t("chat.searchByNick")}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            />
            {loading && <span className={styles.spinner} />}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Список результатів */}
          {!selected && (
            <div className={styles.resultsList}>
              {query.trim().length < 2 && (
                <div className={styles.hint}>{t("chat.searchHint")}</div>
              )}
              {query.trim().length >= 2 && !loading && results.length === 0 && (
                <div className={styles.hint}>{t("chat.notFoundPre")}{query}{t("chat.notFoundPost")}</div>
              )}
              {results.map((u) => (
                <div key={u.id} className={styles.userRow} onClick={() => setSelected(u)}>
                  <div className={styles.avatarWrap}>
                    {u.avatar
                      ? <img className={styles.avatar} src={u.avatar} alt="" />
                      : <div className={styles.avatar} style={{ background: "#E3F2FF", color: "#1565C0" }}>
                          {(u.display_name || u.nickname)[0].toUpperCase()}
                        </div>
                    }
                    <span className={styles.statusDot} style={{ background: STATUS_COLOR[u.status] || "#bbb" }} />
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{u.display_name || u.nickname}</div>
                    <div className={styles.userMeta}>
                      <span className={styles.userNick}>@{u.nickname}</span>
                      <span className={styles.statusTxt} style={{ color: STATUS_COLOR[u.status] }}>
                        {STATUS_LABEL[u.status] || ""}
                      </span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          )}

          {/* Профіль вибраного */}
          {selected && (
            <div className={styles.profile}>
              <button className={styles.backBtn} onClick={() => setSelected(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                {t("chat.back")}
              </button>

              <div className={styles.profileHeader}>
                <div className={styles.profileAvatarWrap}>
                  {selected.avatar
                    ? <img className={styles.profileAvatar} src={selected.avatar} alt="" />
                    : <div className={styles.profileAvatar} style={{ background: "#E3F2FF", color: "#1565C0" }}>
                        {(selected.display_name || selected.nickname)[0].toUpperCase()}
                      </div>
                  }
                  <span
                    className={styles.profileStatusDot}
                    style={{ background: STATUS_COLOR[selected.status] }}
                  />
                </div>
                <div>
                  <div className={styles.profileName}>{selected.display_name || selected.nickname}</div>
                  <div className={styles.profileNick}>@{selected.nickname}</div>
                  <div className={styles.profileStatus} style={{ color: STATUS_COLOR[selected.status] }}>
                    {STATUS_LABEL[selected.status]}
                  </div>
                </div>
              </div>

              {selected.bio && (
                <div className={styles.bio}>{selected.bio}</div>
              )}

              {selected.sharedRooms?.length > 0 && (
                <div className={styles.sharedSection}>
                  <div className={styles.sharedTitle}>{t("chat.sharedRooms")}</div>
                  {selected.sharedRooms.map((r) => (
                    <div key={r.id} className={styles.sharedRoom}>
                      <span className={styles.sharedHash}>#</span>
                      {r.name}
                    </div>
                  ))}
                </div>
              )}

              {selected.id !== currentUserId && (
                <button
                   onClick={() => onStartDM?.(selected.id)}
                   style={{ width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px", marginTop: "16px", cursor: "pointer", fontWeight: "600", fontFamily: "inherit", fontSize: "15px" }}
                >
                  {t("chat.writeMessage") || "Написати повідомлення"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
