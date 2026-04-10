// src/components/AuthScreen.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./AuthScreen.module.css";

export function AuthScreen({ onRegister, onLogin, loading, error }) {
  const { t } = useTranslation();
  const [mode, setMode]     = useState("login");
  const [form, setForm]     = useState({ email: "", password: "", nickname: "", display_name: "" });
  const [success, setSuccess] = useState("");
  const [localError, setLocalError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError("");
    const res = await onLogin({ email: form.email, password: form.password });
    if (!res.success) setLocalError(res.error);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (form.password.length < 8) {
      setLocalError("Password too short"); // Server usually handles, or we can add translation
      return;
    }

    const res = await onRegister({
      email:        form.email,
      password:     form.password,
      nickname:     form.nickname,
      display_name: form.display_name || form.nickname,
    });

    if (res.success) {
      setSuccess(res.message);
      setMode("done");
    } else {
      setLocalError(res.error);
    }
  };

  const err = localError || error;

  if (mode === "done") {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.logo}>✉️</div>
          <h1>{t("auth.title")}</h1>
          <p className={styles.successMsg}>{success}</p>
          <button className={styles.link} onClick={() => setMode("login")}>
            {t("auth.loginBtn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>М</div>
        <h1>{t("auth.title")}</h1>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "login" ? styles.activeTab : ""}`}
            onClick={() => { setMode("login"); setLocalError(""); }}
          >
            {t("auth.loginTab")}
          </button>
          <button
            className={`${styles.tab} ${mode === "register" ? styles.activeTab : ""}`}
            onClick={() => { setMode("register"); setLocalError(""); }}
          >
            {t("auth.registerTab")}
          </button>
        </div>

        {mode === "login" && (
          <form className={styles.form} onSubmit={handleLogin}>
            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set("email")}
              required
              autoFocus
            />
            <input
              className={styles.input}
              type="password"
              placeholder={t("auth.passwordInput")}
              value={form.password}
              onChange={set("password")}
              required
            />
            {err && <p className={styles.error}>{err}</p>}
            <button className={styles.btn} disabled={loading}>
              {loading ? t("auth.loading") : t("auth.loginBtn")}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form className={styles.form} onSubmit={handleRegister}>
            <input
              className={styles.input}
              type="text"
              placeholder="Display Name"
              value={form.display_name}
              onChange={set("display_name")}
              maxLength={60}
            />
            <input
              className={styles.input}
              type="text"
              placeholder={t("auth.loginInput")}
              value={form.nickname}
              onChange={set("nickname")}
              required
              maxLength={30}
            />
            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set("email")}
              required
            />
            <input
              className={styles.input}
              type="password"
              placeholder={t("auth.passwordInput")}
              value={form.password}
              onChange={set("password")}
              required
            />
            {err && <p className={styles.error}>{err}</p>}
            <button className={styles.btn} disabled={loading}>
              {loading ? t("auth.loading") : t("auth.registerBtn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
