// src/components/StickerManager.jsx
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  readPacks,
  createPack,
  deletePack,
  addStickerToPack,
  deleteSticker,
} from "../hooks/useStickerStorage";
import styles from "./StickerManager.module.css";

export function StickerManager({ onClose }) {
  const { t } = useTranslation();
  const [packs, setPacks]             = useState(() => readPacks());
  const [newPackName, setNewPackName] = useState("");
  const [activePack, setActivePack]   = useState(() => readPacks()[0]?.id || null);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState("");
  const fileRef = useRef(null);

  const refresh = () => {
    const updated = readPacks();
    setPacks(updated);
    return updated;
  };

  const handleCreatePack = () => {
    if (!newPackName.trim()) return;
    setError("");
    const pack = createPack(newPackName.trim());
    refresh();
    setActivePack(pack.id);
    setNewPackName("");
  };

  const handleFileChange = async (e) => {
    if (!activePack) { setError(t("stickers.selectOrCreate")); return; }
    const files = Array.from(e.target.files);
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        await addStickerToPack(activePack, file);
      }
      refresh();
    } catch (err) {
      setError(err.message || t("stickers.uploadError"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteSticker = (stickerId) => {
    deleteSticker(stickerId);
    refresh();
  };

  const handleDeletePack = (packId) => {
    if (!window.confirm(t("stickers.deletePackConfirm"))) return;
    deletePack(packId);
    const remaining = refresh();
    setActivePack(remaining[0]?.id || null);
  };

  const currentPack = packs.find((p) => p.id === activePack);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{t("stickers.myStickers")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>

          <div className={styles.sidebar}>
            <div className={styles.sidebarTitle}>{t("stickers.packs")}</div>

            {packs.map((pack) => (
              <div
                key={pack.id}
                className={`${styles.packItem} ${activePack === pack.id ? styles.packActive : ""}`}
                onClick={() => setActivePack(pack.id)}
              >
                <div className={styles.packThumb}>
                  {pack.stickers?.[0]
                    ? <img src={pack.stickers[0].dataUrl} alt="" />
                    : <span>📦</span>
                  }
                </div>
                <div className={styles.packInfo}>
                  <div className={styles.packName}>{pack.name}</div>
                  <div className={styles.packCount}>{pack.stickers?.length || 0} {t("stickers.itemsCount")}</div>
                </div>
                <button
                  className={styles.deletePackBtn}
                  onClick={(e) => { e.stopPropagation(); handleDeletePack(pack.id); }}
                  title={t("stickers.deletePack")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              </div>
            ))}

            <div className={styles.newPack}>
              <input
                className={styles.newPackInput}
                placeholder={t("stickers.packName")}
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePack()}
                maxLength={40}
              />
              <button
                className={styles.newPackBtn}
                onClick={handleCreatePack}
                disabled={!newPackName.trim()}
              >
                +
              </button>
            </div>

            <div className={styles.storageNote}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {t("stickers.browserStored")}
            </div>
          </div>

          <div className={styles.content}>
            {!currentPack && (
              <div className={styles.emptyState}>
                <p>{t("stickers.createFirstPack")}</p>
              </div>
            )}

            {currentPack && (
              <>
                <div className={styles.contentHeader}>
                  <span className={styles.contentTitle}>{currentPack.name}</span>
                  <button
                    className={styles.uploadBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? t("stickers.uploading") : t("stickers.addStickers")}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.stickerGrid}>
                  {currentPack.stickers?.length === 0 && (
                    <div className={styles.gridEmpty}>
                      {t("stickers.clickToAdd")}
                    </div>
                  )}
                  {(currentPack.stickers || []).map((s) => (
                    <div key={s.id} className={styles.stickerCard}>
                      <img
                        src={s.dataUrl}
                        alt=""
                        className={styles.stickerPreview}
                      />
                      <button
                        className={styles.deleteStickerBtn}
                        onClick={() => handleDeleteSticker(s.id)}
                        title={t("stickers.deleteSticker")}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
