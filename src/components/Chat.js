import React, { useState, useEffect, useRef } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import axios from "axios";
import { searchGifs } from "../tenor";
import "./DarkTheme.css";

const Chat = ({ messages, newMessage, setNewMessage, sendMessage, user, friend }) => {
    const [senders, setSenders] = useState({});
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifQuery, setGifQuery] = useState("");
    const [gifResults, setGifResults] = useState([]);
    const [isLoadingGifs, setIsLoadingGifs] = useState(false);

    const getAvatarUrl = (senderId, avatar) => avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${senderId}`;
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        const uniqueSenderIds = [...new Set(messages.map((m) => m.sender))];
        const unsubs = {};
        uniqueSenderIds.forEach((senderId) => {
            const unsub = onValue(ref(database, `users/${senderId}`), (snap) => {
                const data = snap.val();
                if (data) {
                    setSenders((p) => ({ ...p, [senderId]: { name: data.name || "Unknown", avatar: data.avatar } }));
                } else {
                    setSenders((p) => ({ ...p, [senderId]: { name: senderId === user?.uid ? (user.displayName || user.email?.split("@")[0] || "You") : "Unknown", avatar: null } }));
                }
            });
            unsubs[senderId] = unsub;
        });
        return () => Object.values(unsubs).forEach((u) => { try { u(); } catch (_) {} });
    }, [messages, user]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (newMessage.trim()) { sendMessage({ text: newMessage }); scrollToBottom(); }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "messenger_upload");
            formData.append("cloud_name", "dpbojl4sb");
            const res = await axios.post("https://api.cloudinary.com/v1_1/dpbojl4sb/image/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
            if (res.status === 200 && res.data.secure_url) { sendMessage({ imageUrl: res.data.secure_url }); scrollToBottom(); }
        } catch (err) { console.error(err); alert("Upload failed."); }
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };

    const handleSearchGifs = async () => {
        if (!gifQuery.trim()) return;
        try { setIsLoadingGifs(true); const r = await searchGifs(gifQuery.trim(), 24); setGifResults(r); }
        catch (err) { console.error(err); alert("GIF search failed."); }
        finally { setIsLoadingGifs(false); }
    };

    const handleSelectGif = (gif) => {
        if (!gif?.url) return;
        sendMessage({ gifUrl: gif.url });
        scrollToBottom();
        setShowGifPicker(false);
    };

    const friendAvatar = friend?.avatar || `https://api.dicebear.com/9.x/${friend?.isGroup ? "shapes" : "avataaars"}/svg?seed=${friend?.id}`;

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-0)" }}>
            {/* Chat header strip */}
            {friend && (
                <div style={{
                    height: "36px",
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--bg-2)",
                    flexShrink: 0,
                }}>
                    <img src={friendAvatar} alt={friend.name} className="avatar" style={{ width: "20px", height: "20px", border: "1px solid var(--line)", filter: friend.online ? "none" : "grayscale(70%)" }} />
                    <span style={{ fontWeight: 500, fontSize: "12px", color: "var(--text-0)", letterSpacing: "0.04em" }}>
                        {friend.name}
                    </span>
                    {!friend.isGroup && (
                        <>
                            <div className={`status-dot ${friend.online ? "status-online" : "status-offline"}`} />
                            <span style={{ fontSize: "10px", color: friend.online ? "var(--green-lit)" : "var(--text-2)", letterSpacing: "0.08em" }}>
                                {friend.online ? "ONLINE" : "OFFLINE"}
                            </span>
                        </>
                    )}
                    {friend.isGroup && (
                        <span style={{ fontSize: "10px", color: "var(--text-2)", letterSpacing: "0.08em" }}>
                            {friend.membersCount || 0} MEMBERS
                        </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: "10px", color: "var(--text-2)", letterSpacing: "0.06em" }}>
                        {friend.isGroup ? friend.publicId && `#${friend.publicId}` : friend.numericId && `#${friend.numericId}`}
                    </span>
                </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {messages.length === 0 ? (
                    <div style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--text-2)", fontSize: "11px", letterSpacing: "0.12em",
                        flexDirection: "column", gap: "8px",
                    }}>
                        <div style={{ color: "var(--amber)", fontSize: "10px" }}>— NO MESSAGES —</div>
                        <div>SEND THE FIRST MESSAGE</div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender === user.uid;
                        const sender = senders[msg.sender] || {
                            name: isMe ? (user.displayName || user.email?.split("@")[0] || "You") : "Unknown",
                            avatar: null,
                        };
                        const t = new Date(msg.timestamp);
                        const timeStr = t.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" });

                        return (
                            <div key={index} className="message-bubble" style={{
                                display: "flex",
                                flexDirection: isMe ? "row-reverse" : "row",
                                gap: "8px",
                                alignItems: "flex-start",
                            }}>
                                <img
                                    src={getAvatarUrl(msg.sender, sender.avatar)}
                                    alt={sender.name}
                                    className="avatar"
                                    style={{ width: "22px", height: "22px", border: `1px solid ${isMe ? "var(--amber-dim)" : "var(--line)"}`, flexShrink: 0, marginTop: "2px" }}
                                />
                                <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: "3px" }}>
                                    {/* meta row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexDirection: isMe ? "row-reverse" : "row" }}>
                                        <span style={{ fontSize: "10px", fontWeight: 600, color: isMe ? "var(--amber)" : "var(--text-1)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                            {sender.name}
                                        </span>
                                        <span style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.06em" }}>
                                            {timeStr}
                                        </span>
                                    </div>

                                    {/* bubble */}
                                    <div style={{
                                        padding: "7px 10px",
                                        background: isMe ? "var(--amber)" : "var(--bg-3)",
                                        border: `1px solid ${isMe ? "var(--amber)" : "var(--line)"}`,
                                        color: isMe ? "var(--text-inv)" : "var(--text-0)",
                                    }}>
                                        {msg.text && (
                                            <div style={{ fontSize: "12px", lineHeight: "1.55", wordBreak: "break-word", letterSpacing: "0.02em" }}>
                                                {msg.text}
                                            </div>
                                        )}
                                        {msg.imageUrl && (
                                            <img src={msg.imageUrl} alt="attachment" style={{ maxWidth: "240px", display: "block", marginTop: msg.text ? "6px" : 0, border: "1px solid var(--line)" }} />
                                        )}
                                        {msg.gifUrl && (
                                            <img src={msg.gifUrl} alt="gif" style={{ maxWidth: "240px", display: "block", marginTop: msg.text ? "6px" : 0, border: "1px solid var(--line)" }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} style={{ height: "1px" }} />
            </div>

            {/* GIF Picker */}
            {showGifPicker && (
                <div style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)", padding: "8px 12px", maxHeight: "200px", display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                        <input
                            type="text"
                            value={gifQuery}
                            onChange={(e) => setGifQuery(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSearchGifs()}
                            placeholder="SEARCH GIFS..."
                            className="input-base"
                            style={{ height: "26px", flex: 1 }}
                        />
                        <button onClick={handleSearchGifs} className="btn btn-primary" style={{ height: "26px", padding: "0 10px", fontSize: "10px" }}>
                            {isLoadingGifs ? "..." : "GO"}
                        </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: "3px", overflowY: "auto" }}>
                        {gifResults.map((gif) => (
                            <img key={gif.id} src={gif.preview || gif.url} alt={gif.title} onClick={() => handleSelectGif(gif)}
                                style={{ width: "100%", cursor: "pointer", border: "1px solid var(--line)", transition: "border-color 0.08s" }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--amber)"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line)"}
                            />
                        ))}
                        {!isLoadingGifs && gifResults.length === 0 && (
                            <div style={{ gridColumn: "1/-1", fontSize: "10px", color: "var(--text-2)", letterSpacing: "0.06em" }}>
                                ENTER QUERY ABOVE
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input bar */}
            <div style={{
                padding: "8px 12px",
                borderTop: "1px solid var(--line)",
                background: "var(--bg-2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
            }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn btn-ghost"
                    style={{ height: "32px", padding: "0 8px", fontSize: "10px", flexShrink: 0 }}
                    title="Attach"
                >
                    {isUploading ? <div className="spinner" style={{ width: "10px", height: "10px" }} /> : "IMG"}
                </button>

                <button
                    onClick={() => setShowGifPicker(p => !p)}
                    className="btn btn-ghost"
                    style={{
                        height: "32px", padding: "0 8px", fontSize: "10px", flexShrink: 0,
                        borderColor: showGifPicker ? "var(--amber)" : "transparent",
                        color: showGifPicker ? "var(--amber)" : "var(--text-1)",
                    }}
                >
                    GIF
                </button>

                {/* Prompt char */}
                <span style={{ color: "var(--amber)", fontSize: "12px", fontFamily: "var(--font-mono)", flexShrink: 0, letterSpacing: 0 }}>›</span>

                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="TYPE MESSAGE / ENTER TO SEND"
                    style={{
                        flex: 1,
                        height: "32px",
                        minHeight: "32px",
                        maxHeight: "32px",
                        resize: "none",
                        padding: "7px 8px",
                        background: "var(--bg-0)",
                        border: "1px solid var(--line)",
                        color: "var(--text-0)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        letterSpacing: "0.03em",
                        outline: "none",
                        transition: "border-color 0.08s",
                        lineHeight: "1.4",
                        borderRadius: 0,
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--amber)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                />

                <button
                    onClick={() => { if (newMessage.trim()) { sendMessage({ text: newMessage }); scrollToBottom(); } }}
                    disabled={!newMessage.trim()}
                    className="btn btn-primary"
                    style={{
                        height: "32px", padding: "0 14px", fontSize: "10px", flexShrink: 0,
                        opacity: newMessage.trim() ? 1 : 0.35,
                    }}
                >
                    SEND
                </button>
            </div>
        </div>
    );
};

export default Chat;
