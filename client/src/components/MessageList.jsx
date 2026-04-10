// src/components/MessageList.jsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StickerAddPopup } from "./StickerAddPopup";
import styles from "./MessageList.module.css";

export function MessageList({ messages, currentNickname }) {
  const { t } = useTranslation();
  const bottomRef = useRef(null);
  const [addPopup, setAddPopup] = useState(null);
  const [showTime, setShowTime] = useState(true);

  useEffect(() => {
    const applySettings = () => {
      const raw = localStorage.getItem("messenger_settings");
      if (raw) {
        try { setShowTime(JSON.parse(raw).showReadTime !== false); } catch(e){}
      }
    };
    applySettings();
    window.addEventListener("settings_updated", applySettings);
    return () => window.removeEventListener("settings_updated", applySettings);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        {t("chat.noMessages")}
      </div>
    );
  }

  return (
    <>
      <div className={styles.list}>
        {messages.map((msg) => {

          if (msg.type === "system") {
            return (
              <div key={msg._key} className={styles.system}>
                {msg.text || msg.content}
              </div>
            );
          }

          if (msg.type === "error") {
            return (
              <div key={msg._key} className={styles.errorMsg}>
                ⚠ {msg.text || msg.content}
              </div>
            );
          }

          const sender    = msg.nickname || msg.display_name || t("chat.anonymous");
          const isOwn     = sender === currentNickname;
          const isSticker = msg.msg_type === "sticker" || msg.type === "sticker";
          const text      = msg.content || msg.text || "";

          if (!text && !isSticker) return null;

          return (
            <div
              key={msg._key}
              className={`${styles.bubble} ${isOwn ? styles.own : styles.other} ${isSticker ? styles.stickerBubble : ""}`}
            >
              {!isOwn && (
                <span className={styles.nickname}>{sender}</span>
              )}

              {isSticker ? (
                <div className={styles.stickerWrap}>
                  <img
                    src={text}
                    alt="sticker"
                    className={styles.stickerImg}
                  />
                  {msg.packData && msg.packData.length > 0 && (
                    <button
                      className={styles.addPackBtn}
                      title={`${t("chat.addPack")}${msg.packName || t("addSticker")}»`}
                      onClick={() => setAddPopup({
                        packName: msg.packName || t("addSticker"),
                        packData: msg.packData,
                      })}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <p className={styles.text}>{text}</p>
              )}

              {showTime && (
                <span className={styles.time}>
                  {formatTime(msg.created_at || msg.timestamp)}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {addPopup && (
        <StickerAddPopup
          packName={addPopup.packName}
          packData={addPopup.packData}
          onClose={() => setAddPopup(null)}
        />
      )}
    </>
  );
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString(navigator.language || "uk-UA", {
    hour: "2-digit", minute: "2-digit",
  });
}
