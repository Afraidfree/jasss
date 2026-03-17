import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, set, onValue, get, update } from "firebase/database";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/DarkTheme.css";

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [newAvatar, setNewAvatar] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [numericId, setNumericId] = useState("");
    const [loading, setLoading] = useState(false);
    const [isGeneratingId, setIsGeneratingId] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);

    const generateNumericId = async (uid) => {
        let newId, isUnique = false, attempts = 0;
        while (!isUnique && attempts < 10) {
            const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
            newId = randomNum.toString();
            const snap = await get(ref(database, `numericIds/${newId}`));
            if (!snap.exists()) {
                await set(ref(database, `numericIds/${newId}`), true);
                await set(ref(database, `numericIdToUid/${newId}/${uid}`), true);
                isUnique = true;
            }
            attempts++;
        }
        if (!isUnique) throw new Error("Failed to generate unique ID.");
        return newId;
    };

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                onValue(ref(database, `users/${currentUser.uid}`), async (snap) => {
                    const data = snap.val();
                    if (data) {
                        setName(data.name || "");
                        setAvatar(data.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${currentUser.uid}`);
                        setNumericId(data.numericId || "");
                    } else {
                        setIsGeneratingId(true);
                        try {
                            const newId = await generateNumericId(currentUser.uid);
                            setNumericId(newId);
                            await set(ref(database, `users/${currentUser.uid}`), {
                                name: currentUser.displayName || currentUser.email.split("@")[0],
                                avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${currentUser.uid}`,
                                numericId: newId,
                            });
                        } catch (e) { console.error(e); }
                        finally { setIsGeneratingId(false); }
                    }
                });
            } else { window.location.href = "/"; }
        });
        return () => unsub();
    }, []);

    const handleAvatarChange = (e) => {
        if (e.target.files[0]) { setNewAvatar(e.target.files[0]); setPreviewUrl(URL.createObjectURL(e.target.files[0])); }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let avatarUrl = avatar;
            if (newAvatar) {
                const formData = new FormData();
                formData.append("file", newAvatar);
                formData.append("upload_preset", "messenger_upload");
                formData.append("cloud_name", "dpbojl4sb");
                const res = await axios.post("https://api.cloudinary.com/v1_1/dpbojl4sb/image/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                if (res.status === 200) { avatarUrl = res.data.secure_url; setAvatar(avatarUrl); setNewAvatar(null); setPreviewUrl(null); }
                else throw new Error("Upload error");
            }
            await update(ref(database, `users/${user.uid}`), {
                name: name || user.displayName || user.email.split("@")[0],
                avatar: avatarUrl, numericId,
            });
            setSaved(true); setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error(e); alert("Error: " + e.message); }
        finally { setLoading(false); }
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(numericId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    };

    const handleLogout = () => { auth.signOut(); navigate("/"); };

    const displayAvatar = previewUrl || avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.uid}`;

    if (!user) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-0)", color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em" }}>
            <div className="spinner" style={{ marginRight: "10px" }} /> LOADING...
        </div>
    );

    const Row = ({ label, children }) => (
        <div style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: "6px" }}>
                {label}
            </div>
            {children}
        </div>
    );

    return (
        <div style={{
            minHeight: "100vh",
            background: "var(--bg-0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            overflow: "auto",
            position: "relative",
        }}>
            {/* Grid bg */}
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none",
                backgroundImage: "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
                backgroundSize: "40px 40px", opacity: 0.4,
            }} />

            <div className="fade-in" style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
                {/* Title bar */}
                <div style={{
                    borderTop: "1px solid var(--amber)",
                    borderLeft: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    background: "var(--bg-2)",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 12px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            onClick={() => navigate("/home")}
                            style={{ background: "none", border: "none", color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer", padding: 0, transition: "color 0.08s" }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--amber)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-1)"}
                        >
                            ← BACK
                        </button>
                        <span style={{ color: "var(--line)", fontSize: "10px" }}>|</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", color: "var(--text-0)" }}>
                            PROFILE
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--red-lit)", cursor: "pointer", padding: 0, transition: "color 0.08s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--text-0)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--red-lit)"}
                    >
                        LOGOUT →
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    border: "1px solid var(--line)",
                    borderTop: "none",
                    background: "var(--bg-2)",
                    padding: "16px",
                }}>
                    {/* Avatar row */}
                    <Row label="AVATAR">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <img
                                src={displayAvatar}
                                alt="avatar"
                                style={{ width: "48px", height: "48px", border: "1px solid var(--amber-dim)", objectFit: "cover" }}
                            />
                            <div>
                                <label
                                    htmlFor="avatar-input"
                                    className="btn"
                                    style={{ cursor: "pointer", height: "26px", padding: "0 10px", fontSize: "10px", display: "inline-flex", alignItems: "center" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--amber)"; e.currentTarget.style.color = "var(--text-0)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-1)"; }}
                                >
                                    CHANGE IMAGE
                                </label>
                                <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                                {previewUrl && (
                                    <div style={{ fontSize: "9px", color: "var(--amber)", marginTop: "4px", letterSpacing: "0.06em" }}>
                                        NEW IMAGE STAGED
                                    </div>
                                )}
                            </div>
                        </div>
                    </Row>

                    {/* Name row */}
                    <Row label="DISPLAY NAME">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={user.email?.split("@")[0] || "Enter name"}
                            className="input-base"
                            style={{ height: "30px" }}
                        />
                    </Row>

                    {/* ID row */}
                    <Row label="YOUR ID">
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <div style={{
                                flex: 1,
                                height: "30px",
                                background: "var(--bg-0)",
                                border: "1px solid var(--line)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0 10px",
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                letterSpacing: "0.12em",
                                color: "var(--amber)",
                                fontWeight: 500,
                            }}>
                                {isGeneratingId ? "GENERATING..." : (numericId || "—")}
                            </div>
                            <button
                                onClick={handleCopyId}
                                className="btn"
                                style={{
                                    height: "30px",
                                    padding: "0 10px",
                                    fontSize: "10px",
                                    flexShrink: 0,
                                    borderColor: copied ? "var(--green-lit)" : "var(--line)",
                                    color: copied ? "var(--green-lit)" : "var(--text-1)",
                                }}
                            >
                                {copied ? "COPIED" : "COPY"}
                            </button>
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--text-2)", marginTop: "5px", letterSpacing: "0.06em" }}>
                            SHARE WITH CONTACTS TO CONNECT
                        </div>
                    </Row>

                    {/* Email row */}
                    <Row label="ACCOUNT">
                        <div style={{ fontSize: "11px", color: "var(--text-1)", letterSpacing: "0.04em" }}>
                            {user.email}
                        </div>
                    </Row>

                    {/* Save */}
                    <div style={{ marginTop: "14px" }}>
                        <button
                            onClick={handleSave}
                            disabled={loading || isGeneratingId}
                            className="btn btn-primary"
                            style={{
                                width: "100%",
                                height: "34px",
                                fontSize: "11px",
                                letterSpacing: "0.12em",
                                opacity: (loading || isGeneratingId) ? 0.5 : 1,
                                cursor: (loading || isGeneratingId) ? "not-allowed" : "pointer",
                                background: saved ? "var(--green-lit)" : "var(--amber)",
                                borderColor: saved ? "var(--green-lit)" : "var(--amber)",
                            }}
                        >
                            {loading ? <div className="spinner" style={{ width: "12px", height: "12px", borderTopColor: "var(--text-inv)" }} />
                                : saved ? "SAVED ✓"
                                : "SAVE CHANGES"}
                        </button>
                    </div>
                </div>

                {/* Status bar */}
                <div style={{
                    borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
                    background: "var(--bg-1)", padding: "5px 10px",
                    display: "flex", alignItems: "center", gap: "6px",
                }}>
                    <div style={{ width: "5px", height: "5px", background: "var(--green-lit)", animation: "blink 1.8s step-end infinite" }} />
                    <span style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.1em" }}>SESSION ACTIVE</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                        {user.uid?.slice(0, 8)}...
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Profile;
