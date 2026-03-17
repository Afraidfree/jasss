import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "../firebase";
import "./DarkTheme.css";

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);
    const [tick, setTick] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const t = setInterval(() => setTick(p => !p), 600);
        const t2 = setTimeout(() => setMounted(true), 80);
        return () => { clearInterval(t); clearTimeout(t2); };
    }, []);

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

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(""); setInfo(""); setLoading(true);
        try {
            if (isSignUp) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(cred.user);
                const numericId = await generateNumericId(cred.user.uid);
                await set(ref(database, `users/${cred.user.uid}`), {
                    name: email.split("@")[0],
                    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${cred.user.uid}`,
                    numericId, online: false, lastSeen: Date.now(),
                });
                setInfo("VERIFICATION LINK SENT. CHECK YOUR INBOX.");
                await auth.signOut();
            } else {
                const cred = await signInWithEmailAndPassword(auth, email, password);
                if (!cred.user.emailVerified) {
                    setError("EMAIL NOT VERIFIED. CHECK YOUR INBOX.");
                    await auth.signOut(); return;
                }
                window.location.href = "/home";
            }
        } catch (err) {
            const msgs = {
                "auth/email-already-in-use": "EMAIL ALREADY IN USE.",
                "auth/invalid-email": "INVALID EMAIL ADDRESS.",
                "auth/weak-password": "PASSWORD MIN 6 CHARS.",
                "auth/user-not-found": "USER NOT FOUND.",
                "auth/wrong-password": "WRONG PASSWORD.",
                "auth/invalid-credential": "INVALID CREDENTIALS.",
                "auth/too-many-requests": "TOO MANY ATTEMPTS. WAIT.",
            };
            setError(msgs[err.code] || err.message.toUpperCase());
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-0)",
            padding: "24px",
            overflow: "auto",
            position: "relative",
        }}>
            {/* Grid background */}
            <div style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                backgroundImage: "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                opacity: 0.4,
            }} />

            <div style={{
                width: "100%",
                maxWidth: "380px",
                position: "relative",
                zIndex: 1,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "none" : "translateY(10px)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
            }}>
                {/* Header bar */}
                <div style={{
                    borderTop: "1px solid var(--amber)",
                    borderLeft: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    padding: "12px 16px 10px",
                    background: "var(--bg-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", background: "var(--amber)" }} />
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "12px", letterSpacing: "0.12em", color: "var(--text-0)" }}>
                            BLINKCHAT
                        </span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-2)", letterSpacing: "0.1em" }}>
                        v2.0.0
                    </span>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", background: "var(--bg-1)" }}>
                    {["SIGN IN", "SIGN UP"].map((label, i) => {
                        const active = i === 0 ? !isSignUp : isSignUp;
                        return (
                            <button
                                key={label}
                                onClick={() => { setIsSignUp(i === 1); setError(""); setInfo(""); }}
                                style={{
                                    flex: 1,
                                    height: "32px",
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: active ? 600 : 400,
                                    fontSize: "10px",
                                    letterSpacing: "0.12em",
                                    background: active ? "var(--bg-3)" : "transparent",
                                    color: active ? "var(--text-0)" : "var(--text-2)",
                                    border: "none",
                                    borderBottom: active ? "1px solid var(--amber)" : "1px solid var(--line)",
                                    borderRight: i === 0 ? "1px solid var(--line)" : "none",
                                    cursor: "pointer",
                                    transition: "all 0.08s",
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Form body */}
                <div style={{
                    border: "1px solid var(--line)",
                    borderTop: "none",
                    background: "var(--bg-2)",
                    padding: "20px 16px",
                }}>
                    {error && (
                        <div style={{
                            padding: "8px 10px",
                            background: "rgba(192,57,43,0.08)",
                            border: "1px solid var(--red)",
                            borderLeft: "2px solid var(--red-lit)",
                            color: "var(--red-lit)",
                            fontSize: "10px",
                            letterSpacing: "0.06em",
                            marginBottom: "14px",
                            fontFamily: "var(--font-mono)",
                        }}>
                            ERROR: {error}
                        </div>
                    )}
                    {info && (
                        <div style={{
                            padding: "8px 10px",
                            background: "rgba(45,106,45,0.08)",
                            border: "1px solid var(--green)",
                            borderLeft: "2px solid var(--green-lit)",
                            color: "var(--green-lit)",
                            fontSize: "10px",
                            letterSpacing: "0.06em",
                            marginBottom: "14px",
                            fontFamily: "var(--font-mono)",
                        }}>
                            OK: {info}
                        </div>
                    )}

                    <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <div style={{ fontSize: "9px", letterSpacing: "0.18em", color: "var(--text-2)", marginBottom: "4px", textTransform: "uppercase" }}>
                                EMAIL
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@domain.com"
                                required
                                className="input-base"
                                style={{ height: "32px" }}
                            />
                        </div>

                        <div>
                            <div style={{ fontSize: "9px", letterSpacing: "0.18em", color: "var(--text-2)", marginBottom: "4px", textTransform: "uppercase" }}>
                                PASSWORD
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isSignUp ? "min. 6 chars" : "••••••••"}
                                required
                                className="input-base"
                                style={{ height: "32px" }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{
                                width: "100%",
                                height: "34px",
                                marginTop: "4px",
                                fontSize: "11px",
                                letterSpacing: "0.12em",
                                opacity: loading ? 0.6 : 1,
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            {loading ? (
                                <div className="spinner" style={{ width: "12px", height: "12px", borderTopColor: "var(--text-inv)" }} />
                            ) : (
                                isSignUp ? "CREATE ACCOUNT" : "AUTHENTICATE"
                            )}
                        </button>
                    </form>
                </div>

                {/* Bottom status bar */}
                <div style={{
                    borderLeft: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--bg-1)",
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                }}>
                    <div style={{ width: "5px", height: "5px", background: "var(--green-lit)", animation: "blink 1.8s step-end infinite" }} />
                    <span style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.1em" }}>
                        CONNECTED · SECURE
                    </span>
                    <div style={{ flex: 1 }} />
                    <span
                        onClick={() => { setIsSignUp(!isSignUp); setError(""); setInfo(""); }}
                        style={{ fontSize: "9px", color: "var(--amber)", letterSpacing: "0.08em", cursor: "pointer" }}
                    >
                        {isSignUp ? "→ SIGN IN" : "→ REGISTER"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Login;
