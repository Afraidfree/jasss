// src/components/CreateGroupModal.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../hooks/useAuth";
import styles from "./CreateGroupModal.module.css";

export function CreateGroupModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [name, setName]           = useState("");
  const [desc, setDesc]           = useState("");
  const [isPublic, setIsPublic]   = useState(true);
  const [search, setSearch]       = useState("");
  const [results, setResults]     = useState([]);
  const [invited, setInvited]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [searching, setSearching] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await apiFetch(`/users/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.filter((u) => !invited.find((i) => i.id === u.id)));
      } catch {}
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, invited]);

  const addInvited = (user) => {
    setInvited((prev) => [...prev, user]);
    setSearch("");
    setResults([]);
  };

  const removeInvited = (id) => setInvited((prev) => prev.filter((u) => u.id !== id));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    setLoading(true);
    setError("");
    try {
      // 1. Створюємо групу
      const res = await apiFetch("/groups", {
        method: "POST",
        body: {
          name:        name.trim(),
          description: desc.trim(),
          is_public:   isPublic,
          members:     invited.map((u) => u.id),
        },
      });
      let data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 2. Якщо є аватар — завантажуємо
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const avatarRes = await apiFetch(`/groups/${data.slug}/avatar`, {
          method: "POST",
          body: formData,
        });
        if (avatarRes.ok) {
          const avatarData = await avatarRes.json();
          data = { ...data, ...avatarData.room };
        }
      }

      onCreated(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{t("chat.newGroup")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarPicker} onClick={() => document.getElementById("group-avatar-input").click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              )}
              <div className={styles.avatarOverlay}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input 
              id="group-avatar-input"
              type="file" 
              style={{ display: "none" }} 
              accept="image/*" 
              onChange={handleAvatarChange} 
            />
          </div>

          <label className={styles.label}>{t("chat.groupName")}</label>
          <input
            className={styles.input}
            placeholder={t("chat.groupNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
          />

          <label className={styles.label}>{t("chat.groupDesc")}</label>
          <textarea
            className={styles.textarea}
            placeholder={t("chat.groupDescPlaceholder")}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={300}
            rows={2}
          />

          <label className={styles.switchRow}>
            <span className={styles.switchLabel}>
              <span>{isPublic ? t("chat.public") : t("chat.private")}</span>
              <span className={styles.switchSub}>
                {isPublic ? t("chat.publicInfo") : t("chat.privateInfo")}
              </span>
            </span>
            <div
              className={`${styles.toggle} ${isPublic ? styles.toggleOn : ""}`}
              onClick={() => setIsPublic((p) => !p)}
            >
              <span className={styles.toggleThumb} />
            </div>
          </label>

          <label className={styles.label}>{t("chat.addMembers")}</label>
          <div className={styles.searchBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className={styles.searchInput}
              placeholder={t("chat.searchByNick")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && <span className={styles.spinner} />}
          </div>

          {results.length > 0 && (
            <div className={styles.searchResults}>
              {results.map((u) => (
                <div key={u.id} className={styles.userRow} onClick={() => addInvited(u)}>
                  <div className={styles.userAvatar}>
                    {u.avatar
                      ? <img src={u.avatar} alt="" />
                      : <span>{u.display_name?.[0] || u.nickname[0]}</span>
                    }
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{u.display_name || u.nickname}</div>
                    <div className={styles.userNick}>@{u.nickname}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              ))}
            </div>
          )}

          {invited.length > 0 && (
            <div className={styles.invited}>
              {invited.map((u) => (
                <div key={u.id} className={styles.invitedChip}>
                  <span>{u.display_name || u.nickname}</span>
                  <button onClick={() => removeInvited(u.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>{t("profile.cancel")}</button>
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? t("chat.creating") : `${t("chat.createGroup")}${invited.length > 0 ? ` (${invited.length + 1})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
