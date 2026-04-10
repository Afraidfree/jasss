// src/hooks/useAuth.js
// Управління авторизацією: реєстрація, логін, логаут, refresh токенів

import { useState, useCallback, useEffect } from "react";

const API = "/api";

// ── Зберігання токенів ────────────────────────────────────────
const storage = {
  getAccess:      ()      => localStorage.getItem("access_token"),
  setAccess:      (t)     => localStorage.setItem("access_token", t),
  getRefresh:     ()      => localStorage.getItem("refresh_token"),
  setRefresh:     (t)     => localStorage.setItem("refresh_token", t),
  getUser:        ()      => {
    try {
      const u = localStorage.getItem("user");
      if (!u || u === "undefined") return null;
      return JSON.parse(u);
    } catch {
      return null;
    }
  },
  setUser:        (u)     => localStorage.setItem("user", JSON.stringify(u)),
  clear:          ()      => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },
};

// ── Базовий fetch з авто-refresh ──────────────────────────────
export async function apiFetch(path, options = {}) {
  const token = storage.getAccess();

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  // Якщо токен прострочений — пробуємо оновити
  if (res.status === 401) {
    const data = await res.json();
    if (data.code === "TOKEN_EXPIRED") {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Повторюємо запит з новим токеном
        return apiFetch(path, options);
      }
    }
    throw new Error(data.error || "Unauthorized");
  }

  return res;
}

async function tryRefreshToken() {
  const refreshToken = storage.getRefresh();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      storage.clear();
      return false;
    }

    const data = await res.json();
    storage.setAccess(data.accessToken);
    return true;
  } catch {
    storage.clear();
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// ХУК
// ══════════════════════════════════════════════════════════════
export function useAuth() {
  const [user, setUser]       = useState(storage.getUser);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // При монтуванні — перевіряємо чи токен ще живий
  useEffect(() => {
    if (!storage.getAccess()) return;
    apiFetch("/auth/me")
      .then((r) => r.json())
      .then((u) => { storage.setUser(u); setUser(u); })
      .catch(() => { storage.clear(); setUser(null); });
  }, []);

  // ── Реєстрація ────────────────────────────────────────────────
  const register = useCallback(async ({ email, password, nickname, display_name }) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname, display_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return { success: true, message: data.message };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Логін ─────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      storage.setAccess(data.accessToken);
      storage.setRefresh(data.refreshToken);
      storage.setUser(data.user);
      setUser(data.user);

      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Логаут ────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: { refreshToken: storage.getRefresh() },
      });
    } catch {}
    storage.clear();
    setUser(null);
  }, []);

  // ── Оновлення профілю локально ────────────────────────────────
  const updateUser = useCallback((updated) => {
    const merged = { ...user, ...updated };
    storage.setUser(merged);
    setUser(merged);
  }, [user]);

  return { user, loading, error, register, login, logout, updateUser };
}
