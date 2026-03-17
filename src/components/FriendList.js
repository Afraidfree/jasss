import React from "react";
import "./DarkTheme.css";

const FriendList = ({
    onSelectFriend, onSelectGroup, onOpenCreateGroup, onDeleteGroup,
    onJoinGroup, onDeleteFriend, user, friends, groups = [],
    searchResult, handleAddFriend, selectedFriend,
}) => {
    const getAvatarUrl = (item) => {
        if (item.avatar) return item.avatar;
        const seed = item.isGroup ? `group-${item.id}` : item.id;
        const style = item.isGroup ? "shapes" : "avataaars";
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
    };

    return (
        <div style={{
            width: "264px",
            minWidth: "264px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--line)",
            background: "var(--bg-1)",
            overflow: "hidden",
        }}>
            {/* Search result */}
            {searchResult && (
                <div style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--bg-3)",
                }}>
                    <div style={{
                        fontSize: "9px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--amber)",
                        marginBottom: "8px",
                    }}>
                        — FOUND —
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <img
                            src={getAvatarUrl(searchResult)}
                            alt="avatar"
                            className="avatar"
                            style={{ width: "32px", height: "32px", border: "1px solid var(--line)" }}
                        />
                        <div>
                            <div style={{ fontWeight: 500, fontSize: "12px", color: "var(--text-0)" }}>
                                {searchResult.name}
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--text-1)", letterSpacing: "0.06em" }}>
                                #{searchResult.numericId}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAddFriend}
                        className="btn btn-primary"
                        style={{ width: "100%", height: "26px", fontSize: "10px" }}
                    >
                        + ADD CONTACT
                    </button>
                </div>
            )}

            {/* Scrollable list */}
            <div style={{ flex: 1, overflowY: "auto" }} className="hide-scrollbar">

                {/* Group buttons */}
                <div style={{
                    display: "flex",
                    borderBottom: "1px solid var(--line)",
                }}>
                    <button
                        onClick={onOpenCreateGroup}
                        style={{
                            flex: 1,
                            height: "30px",
                            fontSize: "9px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--text-1)",
                            background: "none",
                            border: "none",
                            borderRight: "1px solid var(--line)",
                            cursor: "pointer",
                            transition: "background 0.06s, color 0.06s",
                            fontFamily: "var(--font-mono)",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-4)"; e.currentTarget.style.color = "var(--amber)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-1)"; }}
                    >
                        + GROUP
                    </button>
                    {onJoinGroup && (
                        <button
                            onClick={onJoinGroup}
                            style={{
                                flex: 1,
                                height: "30px",
                                fontSize: "9px",
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: "var(--text-1)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                transition: "background 0.06s, color 0.06s",
                                fontFamily: "var(--font-mono)",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-4)"; e.currentTarget.style.color = "var(--amber)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-1)"; }}
                        >
                            JOIN
                        </button>
                    )}
                </div>

                {/* Contacts */}
                {friends.length > 0 && (
                    <>
                        <div className="section-label">
                            CONTACTS [{friends.length}]
                        </div>
                        {friends.map((friend) => {
                            const isActive = selectedFriend?.id === friend.id;
                            return (
                                <div
                                    key={friend.id}
                                    onClick={() => onSelectFriend(friend)}
                                    className={`sidebar-item message-bubble${isActive ? " active" : ""}`}
                                    style={{ height: "40px" }}
                                >
                                    <div style={{ position: "relative", flexShrink: 0 }}>
                                        <img
                                            src={getAvatarUrl(friend)}
                                            alt={friend.name}
                                            className="avatar"
                                            style={{
                                                width: "26px", height: "26px",
                                                border: `1px solid ${isActive ? "var(--amber)" : "var(--line)"}`,
                                                filter: friend.online ? "none" : "grayscale(60%)",
                                            }}
                                        />
                                        <div
                                            className={`status-dot ${friend.online ? "status-online" : "status-offline"}`}
                                            style={{ position: "absolute", bottom: "-2px", right: "-2px" }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: "12px",
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ? "var(--text-0)" : "var(--text-0)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            letterSpacing: "0.02em",
                                        }}>
                                            {friend.name}
                                        </div>
                                        <div style={{
                                            fontSize: "10px",
                                            color: friend.online ? "var(--green-lit)" : "var(--text-2)",
                                            letterSpacing: "0.04em",
                                        }}>
                                            {friend.online ? "ONLINE" : "OFFLINE"}
                                        </div>
                                    </div>
                                    {onDeleteFriend && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteFriend(friend); }}
                                            className="delete-btn"
                                            style={{
                                                opacity: 0,
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                color: "var(--red-lit)",
                                                fontSize: "11px",
                                                padding: "2px 4px",
                                                fontFamily: "var(--font-mono)",
                                                transition: "opacity 0.1s",
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Groups */}
                {groups.length > 0 && (
                    <>
                        <div className="section-label" style={{ marginTop: "4px" }}>
                            GROUPS [{groups.length}]
                        </div>
                        {groups.map((group) => {
                            const isActive = selectedFriend?.id === group.id;
                            return (
                                <div
                                    key={group.id}
                                    onClick={() => onSelectGroup(group)}
                                    className={`sidebar-item message-bubble${isActive ? " active" : ""}`}
                                    style={{ height: "40px" }}
                                >
                                    <img
                                        src={getAvatarUrl({ ...group, isGroup: true })}
                                        alt={group.name}
                                        className="avatar"
                                        style={{
                                            width: "26px", height: "26px",
                                            border: `1px solid ${isActive ? "var(--amber)" : "var(--line)"}`,
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: "12px",
                                            fontWeight: isActive ? 600 : 400,
                                            color: "var(--text-0)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {group.name}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "var(--text-2)" }}>
                                            {group.membersCount || 0} MEMBERS
                                        </div>
                                    </div>
                                    {onDeleteGroup && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteGroup(group); }}
                                            style={{
                                                opacity: 0,
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                color: "var(--red-lit)",
                                                fontSize: "11px",
                                                padding: "2px 4px",
                                                fontFamily: "var(--font-mono)",
                                                transition: "opacity 0.1s",
                                            }}
                                            className="delete-btn"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Empty */}
                {friends.length === 0 && groups.length === 0 && !searchResult && (
                    <div style={{
                        padding: "24px 12px",
                        color: "var(--text-2)",
                        fontSize: "11px",
                        letterSpacing: "0.06em",
                        lineHeight: 2,
                        borderTop: "1px solid var(--line-soft)",
                    }}>
                        <div style={{ color: "var(--amber)", marginBottom: "8px" }}>NO CONTACTS</div>
                        <div>USE FIND TO SEARCH</div>
                        <div>BY 10-DIGIT ID</div>
                    </div>
                )}
            </div>

            <style>{`.sidebar-item:hover .delete-btn { opacity: 1 !important; }`}</style>
        </div>
    );
};

export default FriendList;
