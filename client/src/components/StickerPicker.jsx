// src/components/StickerPicker.jsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { readPacks } from "../hooks/useStickerStorage";
import styles from "./StickerPicker.module.css";

export function StickerPicker({ onSend, onClose, onManage }) {
  const { t } = useTranslation();
  const [packs, setPacks]           = useState([]);
  const [activePack, setActivePack] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const data = readPacks();
    setPacks(data);
    if (data.length > 0) setActivePack(data[0].id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const currentPack = packs.find((p) => p.id === activePack);

  return (
    <div className={styles.picker} ref={ref}>
      <div className={styles.tabs}>
        {packs.map((pack) => (
          <button
            key={pack.id}
            className={`${styles.tab} ${activePack === pack.id ? styles.activeTab : ""}`}
            onClick={() => setActivePack(pack.id)}
            title={pack.name}
          >
            {pack.stickers?.[0]
              ? <img src={pack.stickers[0].dataUrl} alt="" className={styles.tabImg} />
              : <span className={styles.tabEmoji}>📦</span>
            }
          </button>
        ))}

        <button className={styles.manageBtn} onClick={onManage} title={t("stickers.manageStickers")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div className={styles.grid}>
        {packs.length === 0 && (
          <div className={styles.empty}>
            <p>{t("stickers.noStickersYet")}</p>
            <button className={styles.createBtn} onClick={onManage}>
              {t("stickers.createPackBtn")}
            </button>
          </div>
        )}

        {currentPack && currentPack.stickers?.length === 0 && (
          <div className={styles.hint}>{t("stickers.packEmpty")}</div>
        )}

        {currentPack?.stickers?.map((sticker) => (
          <button
            key={sticker.id}
            className={styles.stickerBtn}
            onClick={() => { onSend(sticker); onClose(); }}
            title={sticker.name || sticker.emoji}
          >
            <img
              src={sticker.dataUrl}
              alt={sticker.emoji}
              className={styles.stickerImg}
            />
          </button>
        ))}
      </div>

      {currentPack && (
        <div className={styles.packName}>{currentPack.name}</div>
      )}
    </div>
  );
}
