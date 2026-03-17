import React, { useEffect, useState } from "react";
import "./DarkTheme.css";

const Header = ({ isSearchOpen, setIsSearchOpen, searchId, setSearchId, handleKeyPress, handleClearSearch }) => {
    const [isLight, setIsLight] = useState(false);
    const [time, setTime] = useState("");

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-GB", { hour12: false }));
        };
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (typeof document !== "undefined") {
            const saved = window.localStorage.getItem("blinkchat-theme");
            if (saved === "light") {
                document.body.classList.add("theme-light");
                setIsLight(true);
            }
        }
    }, []);

    const toggleTheme = () => {
        const body = document.body;
        const next = !isLight;
        setIsLight(next);
        if (next) { body.classList.add("theme-light"); window.localStorage.setItem("blinkchat-theme", "light"); }
        else       { body.classList.remove("theme-light"); window.localStorage.setItem("blinkchat-theme", "dark"); }
    };

    const headerStyle = {
        height: "48px",
        padding: "0 12px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--bg-2)",
        flexShrink: 0,
        userSelect: "none",
    };

    return (
        <div style={headerStyle}>
            {!isSearchOpen ? (
                <>
                    {/* Logo + wordmark */}
                    <button
                        onClick={() => window.location.href = "/profile"}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0 6px 0 0",
                            height: "100%",
                            borderRight: "1px solid var(--line)",
                            marginRight: "4px",
                        }}
                        title="Profile"
                    >
                        <span style={{
                            width: "16px", height: "16px",
                            background: "var(--amber)",
                            display: "inline-block",
                            flexShrink: 0,
                        }} />
                        <span style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                            fontSize: "12px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--text-0)",
                        }}>
                            BlinkChat
                        </span>
                    </button>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Clock */}
                    <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--text-2)",
                        letterSpacing: "0.1em",
                        paddingRight: "8px",
                        borderRight: "1px solid var(--line)",
                    }}>
                        {time}
                    </span>

                    {/* Theme */}
                    <button
                        onClick={toggleTheme}
                        className="btn btn-ghost"
                        style={{ height: "24px", padding: "0 8px", fontSize: "10px" }}
                        title="Toggle theme"
                    >
                        {isLight ? "DARK" : "LITE"}
                    </button>

                    {/* Search */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="btn btn-ghost"
                        style={{ height: "24px", padding: "0 8px", fontSize: "10px" }}
                        title="Search by ID"
                    >
                        FIND
                    </button>
                </>
            ) : (
                <>
                    <button
                        onClick={() => { setIsSearchOpen(false); handleClearSearch && handleClearSearch(); }}
                        className="btn btn-ghost"
                        style={{ height: "24px", padding: "0 8px", fontSize: "10px", flexShrink: 0 }}
                    >
                        ← ESC
                    </button>
                    <div style={{ position: "relative", flex: 1 }}>
                        <span style={{
                            position: "absolute",
                            left: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            color: "var(--amber)",
                            letterSpacing: "0.1em",
                            pointerEvents: "none",
                        }}>
                            &gt;_
                        </span>
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="ENTER 10-DIGIT ID"
                            className="input-base input-futuristic"
                            style={{ height: "28px", paddingLeft: "32px" }}
                            autoFocus
                        />
                    </div>
                    {searchId && (
                        <button
                            onClick={handleClearSearch}
                            className="btn btn-ghost"
                            style={{ height: "24px", padding: "0 8px", fontSize: "10px", flexShrink: 0 }}
                        >
                            CLR
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default Header;
