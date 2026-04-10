// src/components/MessageInput.jsx
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StickerPicker } from "./StickerPicker";
import { StickerManager } from "./StickerManager";
import styles from "./MessageInput.module.css";

export function MessageInput({ onSend, onSendSticker, disabled }) {
  const { t } = useTranslation();
  const [text, setText]             = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [showManager,  setShowManager]  = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStickerSend = (sticker) => {
    onSendSticker?.(sticker);
    setShowStickers(false);
  };

  return (
    <div className={styles.wrapper}>
      {showStickers && (
        <StickerPicker
          onSend={handleStickerSend}
          onClose={() => setShowStickers(false)}
          onManage={() => { setShowStickers(false); setShowManager(true); }}
        />
      )}

      {showManager && (
        <StickerManager onClose={() => setShowManager(false)} />
      )}

      <button
        className={`${styles.stickerToggle} ${showStickers ? styles.stickerActive : ""}`}
        onClick={() => setShowStickers((v) => !v)}
        disabled={disabled}
        title={t("addSticker")}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>

      <textarea
        ref={textareaRef}
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? t("chat.connecting") : t("chat.typeMessage")}
        disabled={disabled}
        rows={1}
        maxLength={2000}
      />

      <button
        className={styles.button}
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"/>
        </svg>
      </button>
    </div>
  );
}
