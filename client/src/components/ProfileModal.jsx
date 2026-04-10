// src/components/ProfileModal.jsx
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../hooks/useAuth";
import styles from "./ProfileModal.module.css";

export function ProfileModal({ user, onClose, onUpdated }) {
  const { t } = useTranslation();
  
  const STATUS_OPTIONS = [
    { value: "online", label: t("profile.statusOnline"), color: "#43A047" },
    { value: "away",   label: t("profile.statusAway"),   color: "#FB8C00" },
    { value: "busy",   label: t("profile.statusDnd"),    color: "#E53935" },
  ];

  const [form, setForm] = useState({
    display_name: user.display_name || "",
    nickname:     user.nickname     || "",
    bio:          user.bio          || "",
    status:       user.status       || "online",
  });

  const [avatarPreview, setAvatarPreview] = useState(
    user.avatar ? user.avatar : null
  );
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const fileRef = useRef(null);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let updatedUser = { ...user };

      const profileRes = await apiFetch("/profile", {
        method: "PUT",
        body: {
          display_name: form.display_name.trim(),
          nickname:     form.nickname.trim(),
          bio:          form.bio.trim(),
        },
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error || "Save error");
      updatedUser = { ...updatedUser, ...profileData };

      const statusRes = await apiFetch("/profile/status", {
        method: "PUT",
        body: { status: form.status },
      });
      const statusData = await statusRes.json();
      if (statusRes.ok) updatedUser = { ...updatedUser, ...statusData };

      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const token = localStorage.getItem("access_token");
        const avatarRes = await fetch("/api/profile/avatar", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const avatarData = await avatarRes.json();
        if (avatarRes.ok && avatarData.user) {
          updatedUser = { ...updatedUser, ...avatarData.user };
        } else if (!avatarRes.ok) {
          throw new Error(avatarData.error || "Avatar error");
        }
      }

      onUpdated(updatedUser);
      setSuccess("Profile saved!");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = (form.display_name || form.nickname || "?")[0].toUpperCase();

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <h2>{t("profile.editTitle")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>

          <div className={styles.avatarSection}>
            <div className={styles.avatarWrap} onClick={() => fileRef.current?.click()}>
              {avatarPreview
                ? <img className={styles.avatar} src={avatarPreview} alt="" />
                : <div className={styles.avatarPlaceholder}>{initials}</div>
              }
              <div className={styles.avatarOverlay}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>{t("profile.changePhoto")}</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <p className={styles.avatarHint}>{t("profile.photoHint")}</p>
          </div>

          <div className={styles.fields}>

            <div className={styles.field}>
              <label className={styles.label}>{t("profile.name")}</label>
              <input
                className={styles.input}
                type="text"
                placeholder={t("profile.namePlaceholder")}
                value={form.display_name}
                onChange={set("display_name")}
                maxLength={60}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("profile.nickname")}</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputPrefix}>@</span>
                <input
                  className={`${styles.input} ${styles.inputWithPrefix}`}
                  type="text"
                  placeholder="nickname"
                  value={form.nickname}
                  onChange={set("nickname")}
                  maxLength={30}
                />
              </div>
              <p className={styles.hint}>{t("profile.nicknameHint")}</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("profile.bio")}</label>
              <textarea
                className={styles.textarea}
                placeholder={t("profile.bioPlaceholder")}
                value={form.bio}
                onChange={set("bio")}
                maxLength={300}
                rows={3}
              />
              <p className={styles.charCount}>{form.bio.length}/300</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("profile.status")}</label>
              <div className={styles.statusRow}>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    className={`${styles.statusBtn} ${form.status === s.value ? styles.statusActive : ""}`}
                    style={form.status === s.value
                      ? { borderColor: s.color, color: s.color, background: `${s.color}15` }
                      : {}}
                    onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                    type="button"
                  >
                    <span className={styles.statusDot} style={{ background: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {t("profile.cancel")}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={loading || !form.nickname.trim() || !form.display_name.trim()}
          >
            {loading ? t("profile.saving") : t("profile.save")}
          </button>
        </div>

      </div>
    </div>
  );
}
