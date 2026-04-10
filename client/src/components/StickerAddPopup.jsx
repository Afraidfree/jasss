// src/components/StickerAddPopup.jsx
// Telegram-like попап "Додати пакет стікерів"

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { addPackFromChat, readPacks } from "../hooks/useStickerStorage";
import styles from "./StickerAddPopup.module.css";

export function StickerAddPopup({ packName, packData, onClose }) {
  const { t } = useTranslation();
  const [done, setDone]   = useState(false);
  const [count, setCount] = useState(0);

  const alreadyHave = readPacks().some((p) => p.name === packName);

  const handleAdd = () => {
    const pack = addPackFromChat(packName, packData);
    setCount(pack.stickers.length);
    setDone(true);
    // Закрити автоматично через 2с
    setTimeout(onClose, 2000);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.popup}>

        {/* Шапка */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Превью стікерів */}
        <div className={styles.preview}>
          {packData.slice(0, 9).map((s, i) => (
            <div key={i} className={styles.previewItem}>
              <img src={s.dataUrl} alt="" />
            </div>
          ))}
          {packData.length > 9 && (
            <div className={`${styles.previewItem} ${styles.moreItem}`}>
              +{packData.length - 9}
            </div>
          )}
        </div>

        {/* Назва пакету */}
        <div className={styles.packTitle}>{packName}</div>
        <div className={styles.packSub}>{packData.length} {t("stickers.stickersCount")}</div>

        {/* Стан: вже додано / успіх / кнопка */}
        {done ? (
          <div className={styles.successRow}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {t("stickers.packAdded")} ({count} {t("stickers.stickersCount")})
          </div>
        ) : alreadyHave ? (
          <div className={styles.alreadyRow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {t("stickers.alreadyHave")}
            <button className={styles.updateBtn} onClick={handleAdd}>
              {t("stickers.update")}
            </button>
          </div>
        ) : (
          <button className={styles.addBtn} onClick={handleAdd}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t("stickers.addPack")}
          </button>
        )}
      </div>
    </div>
  );
}
