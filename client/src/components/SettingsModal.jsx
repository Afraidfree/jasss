// src/components/SettingsModal.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./SettingsModal.module.css";

const SECTION_ICONS = {
  profile:             ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  appearance:   ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  notifications:         ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  privacy:   ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  language:               ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
};

function Toggle({ checked, onChange }) {
  return (
    <div className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`} onClick={onChange}>
      <span className={styles.toggleThumb} />
    </div>
  );
}

export function SettingsModal({ user, onClose, onEditProfile, onThemeChange }) {
  const { t, i18n } = useTranslation();
  const [section, setSection] = useState("appearance");

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("messenger_settings");
    try {
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      theme:         "light",
      notifications: true,
      sound:         true,
      soundVolume:   80,
      language:      "uk",
      showStatus:    true,
      showReadTime:  true,
      fontSize:      "medium",
    };
  });

  // Зберігаємо при кожній зміні
  useEffect(() => {
    localStorage.setItem("messenger_settings", JSON.stringify(settings));
    window.dispatchEvent(new Event("settings_updated"));
    if (settings.theme === "auto") {
      document.documentElement.setAttribute(
        "data-theme",
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      );
    } else {
      document.documentElement.setAttribute("data-theme", settings.theme);
    }
    onThemeChange?.(settings.theme);
  }, [settings, onThemeChange]);

  const set = (key, val) => {
    if (key === "language") {
      i18n.changeLanguage(val);
    }
    setSettings((s) => ({ ...s, [key]: val }));
  };

  const SECTIONS = [
    { id: "profile", label: t("settings.profile") },
    { id: "appearance", label: t("settings.appearance") },
    { id: "notifications", label: t("settings.notifications") },
    { id: "privacy", label: t("settings.privacy") },
    { id: "language", label: t("settings.language") },
  ];

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Шапка */}
        <div className={styles.header}>
          <h2>{t("settings.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>

          {/* Лівий сайдбар */}
          <nav className={styles.nav}>
            {SECTIONS.map((s) => {
              const Icon = SECTION_ICONS[s.id];
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                  onClick={() => setSection(s.id)}
                >
                  <Icon color={active ? "#2AABEE" : "#aaa"} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Права частина */}
          <div className={styles.content}>

            {/* ── Профіль ── */}
            {section === "profile" && (
              <div className={styles.section}>
                <div className={styles.profileCard}>
                  <div className={styles.profileAvatar}>
                    {user?.avatar
                      ? <img src={user.avatar} alt="" />
                      : <span>{(user?.display_name || user?.nickname || "?")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName}>{user?.display_name || user?.nickname}</div>
                    <div className={styles.profileNick}>@{user?.nickname}</div>
                    {user?.bio && <div className={styles.profileBio}>{user.bio}</div>}
                  </div>
                </div>
                <button className={styles.editBtn} onClick={() => { onClose(); onEditProfile?.(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {t("settings.editProfile")}
                </button>
              </div>
            )}

            {/* ── Зовнішній вигляд ── */}
            {section === "appearance" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t("settings.theme")}</div>
                <div className={styles.themeRow}>
                  {[
                    { value: "light", label: t("settings.light"),  bg: "#f5f7fa", fg: "#111" },
                    { value: "dark",  label: t("settings.dark"),   bg: "#1a1b1e", fg: "#fff" },
                    { value: "auto",  label: t("settings.auto"), bg: "linear-gradient(135deg, #f5f7fa 50%, #1a1b1e 50%)", fg: "#111" },
                  ].map((Math_t) => (
                    <button
                      key={Math_t.value}
                      className={`${styles.themeBtn} ${settings.theme === Math_t.value ? styles.themeBtnActive : ""}`}
                      onClick={() => set("theme", Math_t.value)}
                    >
                      <div className={styles.themePreview} style={{ background: Math_t.bg }}>
                        <div className={styles.themePreviewBar} style={{ background: Math_t.fg === "#fff" ? "#333" : "#e0e0e0" }} />
                        <div className={styles.themePreviewMsg} style={{ background: "#2AABEE" }} />
                        <div className={styles.themePreviewMsg2} style={{ background: Math_t.fg === "#fff" ? "#2a2b2e" : "#fff" }} />
                      </div>
                      <span>{Math_t.label}</span>
                      {settings.theme === Math_t.value && (
                        <span className={styles.checkMark}>✓</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className={styles.divider} />
                <div className={styles.sectionTitle}>{t("settings.fontSize")}</div>
                <div className={styles.fontRow}>
                  {[
                    { value: "small",  label: t("settings.small"),    size: "13px" },
                    { value: "medium", label: t("settings.medium"), size: "15px" },
                    { value: "large",  label: t("settings.large"),  size: "17px" },
                  ].map((f) => (
                    <button
                      key={f.value}
                      className={`${styles.fontBtn} ${settings.fontSize === f.value ? styles.fontBtnActive : ""}`}
                      onClick={() => {
                        set("fontSize", f.value);
                        document.documentElement.style.setProperty("--chat-font-size", f.size);
                      }}
                    >
                      <span style={{ fontSize: f.size }}>Аа</span>
                      <span className={styles.fontLabel}>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Сповіщення ── */}
            {section === "notifications" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t("settings.notifications")}</div>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingLabel}>{t("settings.push")}</div>
                    <div className={styles.settingDesc}>{t("settings.pushDesc")}</div>
                  </div>
                  <Toggle checked={settings.notifications} onChange={() => {
                    if (!settings.notifications && "Notification" in window) {
                      Notification.requestPermission();
                    }
                    set("notifications", !settings.notifications);
                  }} />
                </div>

                <div className={styles.divider} />
                <div className={styles.sectionTitle}>{t("settings.sound")}</div>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingLabel}>{t("settings.sound")}</div>
                    <div className={styles.settingDesc}>{t("settings.soundDesc")}</div>
                  </div>
                  <Toggle checked={settings.sound} onChange={() => set("sound", !settings.sound)} />
                </div>

                {settings.sound && (
                  <div className={styles.settingRow} style={{ marginTop: 8 }}>
                    <div className={styles.settingInfo}>
                      <div className={styles.settingLabel}>{t("settings.volume")}</div>
                    </div>
                    <div className={styles.sliderWrap}>
                      <span className={styles.sliderVal}>{settings.soundVolume}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.soundVolume}
                        onChange={(e) => set("soundVolume", parseInt(e.target.value))}
                        className={styles.slider}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Конфіденційність ── */}
            {section === "privacy" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t("settings.visibility")}</div>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingLabel}>{t("settings.showStatus")}</div>
                    <div className={styles.settingDesc}>{t("settings.showStatusDesc")}</div>
                  </div>
                  <Toggle checked={settings.showStatus} onChange={() => set("showStatus", !settings.showStatus)} />
                </div>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingLabel}>{t("settings.showRead")}</div>
                    <div className={styles.settingDesc}>{t("settings.showReadDesc")}</div>
                  </div>
                  <Toggle checked={settings.showReadTime} onChange={() => set("showReadTime", !settings.showReadTime)} />
                </div>
                <div className={styles.divider} />
                <div className={styles.infoBox}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {t("settings.privacyNote")}
                </div>
              </div>
            )}

            {/* ── Мова ── */}
            {section === "language" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t("settings.interfaceLanguage")}</div>
                {[
                  { value: "uk", label: "Українська",  flag: "🇺🇦" },
                  { value: "en", label: "English",      flag: "🇬🇧" },
                  { value: "pl", label: "Polski",       flag: "🇵🇱" },
                ].map((l) => (
                  <button
                    key={l.value}
                    className={`${styles.langBtn} ${settings.language === l.value ? styles.langActive : ""}`}
                    onClick={() => set("language", l.value)}
                  >
                    <span className={styles.langFlag}>{l.flag}</span>
                    <span className={styles.langLabel}>{l.label}</span>
                    {settings.language === l.value && (
                      <span className={styles.checkMark}>✓</span>
                    )}
                  </button>
                ))}
                <p className={styles.langNote}>
                  {t("settings.langNote")}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
