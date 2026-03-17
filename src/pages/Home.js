import React, { useState, useEffect, useRef } from "react";
import { auth, database } from "../firebase";
import { ref, push, onValue, set, get, update, remove } from "firebase/database";
import { onDisconnect } from "firebase/database";
import axios from "axios";
import Header from "../components/Header";
import FriendList from "../components/FriendList";
import Chat from "../components/Chat";
import "../components/DarkTheme.css";

/* ── Modal primitives ── */
const ModalOverlay = ({ children, onClose }) => (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {children}
    </div>
);

const ModalPanel = ({ title, onClose, children, style = {} }) => (
    <div className="modal-panel" style={{ ...style }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-0)" }}>
                — {title} —
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "12px", transition: "color 0.08s" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--red-lit)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-2)"}
            >
                [×]
            </button>
        </div>
        {children}
    </div>
);

const ModalInput = ({ style = {}, ...props }) => (
    <input className="input-base" style={{ height: "30px", ...style }} {...props} />
);

const ModalActions = ({ children }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
        {children}
    </div>
);

const SectionLabel = ({ children }) => (
    <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: "6px", marginTop: "12px" }}>
        {children}
    </div>
);

/* ─────────────────────────────────────────────────────────────── */

const Home = () => {
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [user, setUser] = useState(null);
    const [friends, setFriends] = useState([]);
    const [groups, setGroups] = useState([]);
    const [searchId, setSearchId] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const friendsUnsubsRef = useRef({});
    const groupsUnsubsRef = useRef({});
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [editedGroupName, setEditedGroupName] = useState("");
    const [groupSearch, setGroupSearch] = useState("");
    const [groupMembers, setGroupMembers] = useState({});
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [groupInfoUsers, setGroupInfoUsers] = useState([]);
    const [groupInfoLoading, setGroupInfoLoading] = useState(false);
    const [groupInfoAddQuery, setGroupInfoAddQuery] = useState("");
    const [groupJoinRequests, setGroupJoinRequests] = useState([]);
    const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);
    const [joinGroupId, setJoinGroupId] = useState("");
    const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
    const userRef = useRef(null);

    const generateGroupPublicId = async () => {
        let newId, isUnique = false, attempts = 0;
        while (!isUnique && attempts < 10) {
            const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
            newId = randomNum.toString();
            const snap = await get(ref(database, "groups"));
            const data = snap.val() || {};
            let exists = false;
            for (const k in data) { if (data[k].publicId === newId) { exists = true; break; } }
            if (!exists) isUnique = true;
            attempts++;
        }
        if (!isUnique) throw new Error("Failed to generate unique group ID.");
        return newId;
    };

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        h(); window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((cu) => {
            if (cu) {
                if (!cu.emailVerified) { window.location.href = "/"; return; }
                setUser(cu); userRef.current = cu;
                set(ref(database, `users/${cu.uid}/online`), true);
                set(ref(database, `users/${cu.uid}/lastSeen`), Date.now());
                onDisconnect(ref(database, `users/${cu.uid}`)).update({ online: false, lastSeen: Date.now() });
            } else { window.location.href = "/"; }
        });
        return () => { unsub(); if (userRef.current) { set(ref(database, `users/${userRef.current.uid}/online`), false); set(ref(database, `users/${userRef.current.uid}/lastSeen`), Date.now()); } };
    }, []);

    useEffect(() => {
        if (!user) return;
        Object.values(friendsUnsubsRef.current).forEach((u) => { try { u(); } catch (_) {} });
        friendsUnsubsRef.current = {};
        const unsubFriends = onValue(ref(database, `users/${user.uid}/friends`), (snap) => {
            const data = snap.val() || {};
            const ids = Object.keys(data).filter((id) => id !== user.uid);
            const cur = friendsUnsubsRef.current;
            Object.keys(cur).forEach((id) => { if (!ids.includes(id)) { try { cur[id](); } catch (_) {} delete cur[id]; } });
            if (ids.length === 0) { setFriends([]); return; }
            ids.forEach((fid) => {
                if (cur[fid]) return;
                const unsub = onValue(ref(database, `users/${fid}`), (fSnap) => {
                    const d = fSnap.val() || {};
                    const upd = { id: fid, name: d.name || "Unknown", avatar: d.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${fid}`, numericId: d.numericId || "", online: d.online || false, lastSeen: d.lastSeen || 0 };
                    setFriends((p) => { const n = [...p]; const i = n.findIndex((f) => f.id === fid); if (i === -1) n.push(upd); else n[i] = { ...n[i], ...upd }; n.sort((a, b) => a.name.localeCompare(b.name)); return n; });
                });
                friendsUnsubsRef.current[fid] = unsub;
            });
        });
        return () => { try { unsubFriends(); } catch (_) {} Object.values(friendsUnsubsRef.current).forEach((u) => { try { u(); } catch (_) {} }); friendsUnsubsRef.current = {}; };
    }, [user]);

    useEffect(() => {
        if (!user) return;
        Object.values(groupsUnsubsRef.current).forEach((u) => { try { u(); } catch (_) {} });
        groupsUnsubsRef.current = {};
        const unsubGroups = onValue(ref(database, `userGroups/${user.uid}`), (snap) => {
            const data = snap.val() || {};
            const ids = Object.keys(data);
            if (ids.length === 0) { setGroups([]); return; }
            const cur = groupsUnsubsRef.current;
            Object.keys(cur).forEach((id) => { if (!ids.includes(id)) { try { cur[id](); } catch (_) {} delete cur[id]; } });
            ids.forEach((gid) => {
                if (cur[gid]) return;
                const unsub = onValue(ref(database, `groups/${gid}`), async (gSnap) => {
                    const d = gSnap.val(); if (!d) return;
                    let publicId = d.publicId || "";
                    if (!publicId) { try { publicId = await generateGroupPublicId(); await update(ref(database, `groups/${gid}`), { publicId }); } catch (e) {} }
                    const members = d.members || {};
                    const upd = { id: gid, name: d.name || "Group", avatar: d.avatar || "", members, membersCount: Object.keys(members).length, isGroup: true, owner: d.owner || "", publicId };
                    setGroups((p) => { const n = [...p]; const i = n.findIndex((g) => g.id === gid); if (i === -1) n.push(upd); else n[i] = { ...n[i], ...upd }; n.sort((a, b) => a.name.localeCompare(b.name)); return n; });
                });
                groupsUnsubsRef.current[gid] = unsub;
            });
        });
        return () => { try { unsubGroups(); } catch (_) {} Object.values(groupsUnsubsRef.current).forEach((u) => { try { u(); } catch (_) {} }); groupsUnsubsRef.current = {}; };
    }, [user]);

    const getChatId = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;

    useEffect(() => {
        if (selectedFriend && user) {
            const chatRef = selectedFriend.isGroup
                ? ref(database, `groupChats/${selectedFriend.id}`)
                : ref(database, `chats/${getChatId(user.uid, selectedFriend.id)}`);
            onValue(chatRef, (snap) => setMessages(snap.val() ? Object.values(snap.val()) : []), (e) => console.error(e));
        } else setMessages([]);
    }, [selectedFriend, user]);

    const sendMessage = (payload = {}) => {
        if (!selectedFriend || !user) return;
        const text = (payload.text ?? newMessage).trim();
        const imageUrl = payload.imageUrl || null;
        const gifUrl = payload.gifUrl || null;
        if (!text && !imageUrl && !gifUrl) return;
        const chatRef = selectedFriend.isGroup ? ref(database, `groupChats/${selectedFriend.id}`) : ref(database, `chats/${getChatId(user.uid, selectedFriend.id)}`);
        push(chatRef, { text, imageUrl, gifUrl, sender: user.uid, timestamp: Date.now() });
        if (payload.text) setNewMessage("");
    };

    const handleSearch = async () => {
        if (!/^\d{10}$/.test(searchId.trim())) { alert("ID must be exactly 10 digits."); return; }
        try {
            const snap = await get(ref(database, "users"));
            const data = snap.val();
            let found = null;
            if (data) {
                for (const uid of Object.keys(data)) {
                    if (uid === user.uid) continue;
                    const s = await get(ref(database, `users/${uid}/numericId`));
                    if (s.val() === searchId) {
                        const [ns, as] = await Promise.all([get(ref(database, `users/${uid}/name`)), get(ref(database, `users/${uid}/avatar`))]);
                        found = { id: uid, name: ns.val(), avatar: as.val(), numericId: searchId };
                        break;
                    }
                }
            }
            if (found) setSearchResult(found);
            else { setSearchResult(null); alert("USER NOT FOUND."); }
        } catch (e) { console.error(e); setSearchResult(null); alert("SEARCH ERROR."); }
    };

    const handleAddFriend = () => {
        if (searchResult && user) {
            set(ref(database, `users/${user.uid}/friends/${searchResult.id}`), true);
            set(ref(database, `users/${searchResult.id}/friends/${user.uid}`), true);
            setFriends((p) => [...p, searchResult]);
            setSearchResult(null); setSearchId(""); setIsSearchOpen(false);
        }
    };

    const handleDeleteFriend = async (friend) => {
        if (!user || !friend?.id) return;
        if (!window.confirm(`REMOVE ${friend.name.toUpperCase()} FROM CONTACTS?`)) return;
        try {
            const cid = getChatId(user.uid, friend.id);
            await Promise.all([remove(ref(database, `users/${user.uid}/friends/${friend.id}`)), remove(ref(database, `users/${friend.id}/friends/${user.uid}`)), remove(ref(database, `chats/${cid}`))]);
            if (selectedFriend?.id === friend.id) { setSelectedFriend(null); setMessages([]); }
        } catch (e) { console.error(e); alert("FAILED TO REMOVE."); }
    };

    const openCreateGroup = (editing = null) => {
        setEditingGroupId(editing?.id || null);
        setGroupName(editing?.name || "");
        const base = editing?.members ? Object.keys(editing.members).reduce((a, id) => ({ ...a, [id]: true }), {}) : user ? { [user.uid]: true } : {};
        setGroupMembers(base); setGroupSearch(""); setIsGroupModalOpen(true);
    };

    const toggleGroupMember = (uid) => setGroupMembers((p) => ({ ...p, [uid]: !p[uid] }));

    const handleSaveGroup = async () => {
        if (!user) return;
        const name = groupName.trim();
        if (!name) { alert("ENTER GROUP NAME."); return; }
        const ids = Object.keys(groupMembers).filter((id) => groupMembers[id]);
        if (ids.length < 1) { alert("SELECT AT LEAST ONE MEMBER."); return; }
        try {
            if (editingGroupId) {
                const eg = groups.find((g) => g.id === editingGroupId);
                if (eg && eg.owner !== user.uid) { alert("ONLY OWNER CAN EDIT."); return; }
                await update(ref(database, `groups/${editingGroupId}`), { name, members: { ...(eg?.members || {}), ...ids.reduce((a, id) => ({ ...a, [id]: true }), {}) } });
                await Promise.all(ids.map((uid) => set(ref(database, `userGroups/${uid}/${editingGroupId}`), true)));
            } else {
                const nr = push(ref(database, "groups"));
                const gid = nr.key;
                const mp = ids.reduce((a, id) => ({ ...a, [id]: true }), { [user.uid]: true });
                const pid = await generateGroupPublicId();
                await set(nr, { name, owner: user.uid, createdAt: Date.now(), members: mp, publicId: pid });
                await Promise.all(Object.keys(mp).map((uid) => set(ref(database, `userGroups/${uid}/${gid}`), true)));
            }
            setIsGroupModalOpen(false);
        } catch (e) { console.error(e); alert("FAILED TO SAVE GROUP."); }
    };

    const handleDeleteGroup = async (group) => {
        if (!user || !group?.id) return;
        if (!window.confirm(`DELETE GROUP "${group.name.toUpperCase()}"?`)) return;
        try {
            const mids = group.members ? Object.keys(group.members) : [];
            await Promise.all([set(ref(database, `groups/${group.id}`), null), set(ref(database, `groupChats/${group.id}`), null), ...mids.map((uid) => set(ref(database, `userGroups/${uid}/${group.id}`), null))]);
            if (selectedFriend?.id === group.id) { setSelectedFriend(null); setMessages([]); }
        } catch (e) { console.error(e); alert("FAILED TO DELETE."); }
    };

    const handleSaveGroupName = async () => {
        if (!selectedFriend?.isGroup || !user) return;
        const n = editedGroupName.trim(); if (!n) return;
        try {
            const s = await get(ref(database, `groups/${selectedFriend.id}`));
            if (s.val().owner !== user.uid) { alert("ONLY OWNER CAN RENAME."); return; }
            await update(ref(database, `groups/${selectedFriend.id}`), { name: n });
            setIsEditingGroupName(false);
        } catch (e) { console.error(e); }
    };

    const openGroupInfo = async () => {
        if (!selectedFriend?.isGroup) return;
        setIsGroupInfoOpen(true); setGroupInfoLoading(true); setGroupInfoUsers([]); setGroupJoinRequests([]);
        try {
            const s = await get(ref(database, `groups/${selectedFriend.id}`));
            const d = s.val() || {};
            const members = d.members || {};
            setEditedGroupName(d.name || ""); setIsEditingGroupName(false);
            const users = await Promise.all(Object.keys(members).map(async (uid) => {
                const us = await get(ref(database, `users/${uid}`));
                const ud = us.val() || {};
                return { uid, name: ud.name || "Unknown", avatar: ud.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${uid}`, numericId: ud.numericId || "", online: ud.online || false, lastSeen: ud.lastSeen || 0 };
            }));
            setGroupInfoUsers(users);
            if (d.owner === user.uid) {
                const rs = await get(ref(database, `groupJoinRequests/${selectedFriend.id}`));
                const rd = rs.val() || {};
                const pending = Object.keys(rd).filter((id) => rd[id].status === "pending");
                const reqs = await Promise.all(pending.map(async (rid) => {
                    const req = rd[rid];
                    try { const us = await get(ref(database, `users/${req.fromUid}`)); const ud = us.val() || {}; return { id: rid, ...req, userName: ud.name || "Unknown", userAvatar: ud.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${req.fromUid}`, userNumericId: ud.numericId || "" }; }
                    catch { return { id: rid, ...req, userName: "Unknown", userAvatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${req.fromUid}`, userNumericId: "" }; }
                }));
                setGroupJoinRequests(reqs);
            }
        } catch (e) { console.error(e); } finally { setGroupInfoLoading(false); }
    };

    const handleJoinGroup = async () => {
        if (!joinGroupId.trim() || !user) return;
        try {
            const s = await get(ref(database, "groups")); const data = s.val() || {};
            let target = null;
            Object.keys(data).forEach((gid) => { if (data[gid].publicId === joinGroupId.trim()) target = { id: gid, ...data[gid] }; });
            if (!target) { alert("GROUP NOT FOUND."); return; }
            if (target.members?.[user.uid]) { alert("ALREADY A MEMBER."); setIsJoinGroupModalOpen(false); setJoinGroupId(""); return; }
            await set(push(ref(database, `groupJoinRequests/${target.id}`)), { fromUid: user.uid, createdAt: Date.now(), status: "pending" });
            alert("REQUEST SENT. WAITING FOR APPROVAL.");
            setIsJoinGroupModalOpen(false); setJoinGroupId("");
        } catch (e) { console.error(e); alert("FAILED TO SEND REQUEST."); }
    };

    const handleApproveRequest = async (rid, fromUid, gid) => {
        if (!user) return;
        try {
            const s = await get(ref(database, `groups/${gid}`));
            if (s.val().owner !== user.uid) { alert("ONLY OWNER CAN APPROVE."); return; }
            await update(ref(database, `groups/${gid}/members`), { [fromUid]: true });
            await set(ref(database, `userGroups/${fromUid}/${gid}`), true);
            await remove(ref(database, `groupJoinRequests/${gid}/${rid}`));
            await openGroupInfo();
        } catch (e) { console.error(e); }
    };

    const handleRejectRequest = async (rid, gid) => {
        if (!user) return;
        try {
            const s = await get(ref(database, `groups/${gid}`));
            if (s.val().owner !== user.uid) { alert("ONLY OWNER CAN REJECT."); return; }
            await remove(ref(database, `groupJoinRequests/${gid}/${rid}`));
            await openGroupInfo();
        } catch (e) { console.error(e); }
    };

    const handleRemoveMember = async (muid, gid) => {
        if (!user) return;
        try {
            const s = await get(ref(database, `groups/${gid}`)); const d = s.val() || {};
            if (d.owner !== user.uid) { alert("ONLY OWNER CAN REMOVE."); return; }
            if (muid === d.owner) { alert("CANNOT REMOVE OWNER."); return; }
            if (!window.confirm("REMOVE THIS MEMBER?")) return;
            await remove(ref(database, `groups/${gid}/members/${muid}`));
            await remove(ref(database, `userGroups/${muid}/${gid}`));
            await openGroupInfo();
        } catch (e) { console.error(e); }
    };

    const handleGroupAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedFriend?.isGroup) return;
        try {
            setIsUploadingGroupAvatar(true);
            const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", "messenger_upload"); fd.append("cloud_name", "dpbojl4sb");
            const res = await axios.post("https://api.cloudinary.com/v1_1/dpbojl4sb/image/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
            if (res.status === 200 && res.data.secure_url) {
                const s = await get(ref(database, `groups/${selectedFriend.id}`));
                if (s.val().owner !== user.uid) { alert("ONLY OWNER CAN CHANGE AVATAR."); return; }
                await update(ref(database, `groups/${selectedFriend.id}`), { avatar: res.data.secure_url });
                setGroups((p) => { const n = [...p]; const i = n.findIndex((g) => g.id === selectedFriend.id); if (i !== -1) n[i] = { ...n[i], avatar: res.data.secure_url }; return n; });
                setSelectedFriend({ ...selectedFriend, avatar: res.data.secure_url });
            }
        } catch (e) { console.error(e); alert("UPLOAD FAILED."); }
        finally { setIsUploadingGroupAvatar(false); }
    };

    const handleAddMemberToCurrentGroup = async () => {
        if (!selectedFriend?.isGroup || !groupInfoAddQuery.trim()) return;
        const tokens = groupInfoAddQuery.trim().split(/[,.;\s]+/).map((t) => t.trim()).filter(Boolean);
        if (!tokens.length) return;
        try {
            const s = await get(ref(database, "users")); const data = s.val() || {};
            const low = tokens.map((t) => t.toLowerCase());
            const matches = Object.keys(data).filter((uid) => { const u = data[uid] || {}; return low.some((tok) => tok === (u.numericId || "").toLowerCase() || tok === (u.name || "").toLowerCase()); }).map((uid) => ({ uid, user: data[uid] }));
            if (!matches.length) { alert("USERS NOT FOUND."); return; }
            await Promise.all(matches.map(({ uid }) => set(ref(database, `groups/${selectedFriend.id}/members/${uid}`), true)));
            await Promise.all(matches.map(({ uid }) => set(ref(database, `userGroups/${uid}/${selectedFriend.id}`), true)));
            setGroupInfoUsers((p) => { const ex = new Set(p.map((u) => u.uid)); const extra = matches.filter(({ uid }) => !ex.has(uid)).map(({ uid, user: u }) => ({ uid, name: u.name || "Unknown", avatar: u.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${uid}`, numericId: u.numericId || "" })); return [...p, ...extra]; });
            setGroupInfoAddQuery("");
        } catch (e) { console.error(e); alert("FAILED."); }
    };

    const handleKeyPress = (e) => { if (e.key === "Enter") handleSearch(); };
    const handleClearSearch = () => { setSearchId(""); setSearchResult(null); setIsSearchOpen(false); };
    const handleBackToFriends = () => { setSelectedFriend(null); setMessages([]); };

    if (!user) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-0)", color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", gap: "8px" }}>
            <div className="spinner" /> INITIALIZING...
        </div>
    );

    const filteredFriends = friends.filter((f) => f.name.toLowerCase().includes(groupSearch.toLowerCase()));

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", background: "var(--bg-0)", overflow: "hidden" }}>
            {/* Sidebar */}
            {(!isMobile || !selectedFriend) && (
                <div style={{ width: isMobile ? "100%" : "264px", minWidth: isMobile ? "100%" : "264px", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <Header isSearchOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen} searchId={searchId} setSearchId={setSearchId} handleKeyPress={handleKeyPress} handleClearSearch={handleClearSearch} />
                    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <FriendList
                            onSelectFriend={(f) => setSelectedFriend({ ...f, isGroup: false })}
                            onSelectGroup={(g) => setSelectedFriend(g)}
                            onOpenCreateGroup={() => openCreateGroup(null)}
                            onDeleteGroup={handleDeleteGroup}
                            onJoinGroup={() => setIsJoinGroupModalOpen(true)}
                            user={user} friends={friends} groups={groups}
                            searchResult={searchResult} handleAddFriend={handleAddFriend}
                            onDeleteFriend={handleDeleteFriend}
                            selectedFriend={selectedFriend}
                        />
                    </div>
                </div>
            )}

            {/* Main */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", minWidth: 0, overflow: "hidden" }}>
                {selectedFriend ? (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                        {/* Tool bar for mobile back + group controls */}
                        {(isMobile || selectedFriend.isGroup) && (
                            <div style={{ height: "36px", display: "flex", alignItems: "center", padding: "0 10px", gap: "6px", borderBottom: "1px solid var(--line)", background: "var(--bg-2)", flexShrink: 0 }}>
                                {isMobile && (
                                    <button onClick={handleBackToFriends} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-1)", cursor: "pointer", transition: "color 0.08s", flexShrink: 0 }}
                                        onMouseEnter={e => e.currentTarget.style.color = "var(--amber)"}
                                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-1)"}
                                    >← BACK</button>
                                )}
                                {selectedFriend.isGroup && (
                                    <>
                                        {isEditingGroupName ? (
                                            <div style={{ flex: 1, display: "flex", gap: "4px", alignItems: "center" }}>
                                                <input value={editedGroupName} onChange={(e) => setEditedGroupName(e.target.value)} className="input-base" style={{ height: "24px", flex: 1, fontSize: "11px" }} onKeyPress={(e) => e.key === "Enter" && handleSaveGroupName()} autoFocus />
                                                <button onClick={handleSaveGroupName} className="btn btn-primary" style={{ height: "24px", padding: "0 8px", fontSize: "9px" }}>OK</button>
                                                <button onClick={() => setIsEditingGroupName(false)} className="btn btn-ghost" style={{ height: "24px", padding: "0 6px", fontSize: "9px" }}>ESC</button>
                                            </div>
                                        ) : (
                                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                                                <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", color: "var(--text-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFriend.name}</span>
                                                <button onClick={() => { setEditedGroupName(selectedFriend.name); setIsEditingGroupName(true); }} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-2)", cursor: "pointer", flexShrink: 0, letterSpacing: "0.06em" }}>[RENAME]</button>
                                            </div>
                                        )}
                                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                                            <label htmlFor="group-avatar-input" className="btn btn-ghost" style={{ height: "24px", padding: "0 7px", fontSize: "9px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                                                {isUploadingGroupAvatar ? <div className="spinner" style={{ width: "8px", height: "8px" }} /> : "IMG"}
                                            </label>
                                            <input id="group-avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleGroupAvatarChange} />
                                            <button onClick={openGroupInfo} className="btn btn-ghost" style={{ height: "24px", padding: "0 8px", fontSize: "9px" }}>MEMBERS</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <div style={{ flex: 1, overflow: "hidden" }}>
                            <Chat messages={messages} newMessage={newMessage} setNewMessage={setNewMessage} sendMessage={sendMessage} user={user} friend={selectedFriend} />
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: isMobile ? "none" : "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-0)", position: "relative", overflow: "hidden" }}>
                        {/* Grid */}
                        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.5 }} />
                        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
                                <div style={{ width: "12px", height: "12px", background: "var(--amber)" }} />
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "16px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-0)" }}>BLINKCHAT</span>
                                <div style={{ width: "12px", height: "12px", background: "var(--amber)" }} />
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-2)", letterSpacing: "0.1em", lineHeight: 2 }}>
                                <div>SELECT A CONVERSATION TO BEGIN</div>
                                <div style={{ color: "var(--amber)", marginTop: "8px" }}>[ USE FIND TO SEARCH BY ID ]</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create Group Modal ── */}
            {isGroupModalOpen && (
                <ModalOverlay onClose={() => setIsGroupModalOpen(false)}>
                    <ModalPanel title={editingGroupId ? "EDIT GROUP" : "CREATE GROUP"} onClose={() => setIsGroupModalOpen(false)} style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                        <SectionLabel>GROUP NAME</SectionLabel>
                        <ModalInput value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="ENTER NAME..." autoFocus style={{ marginBottom: "10px" }} />
                        <SectionLabel>ADD MEMBERS</SectionLabel>
                        <ModalInput value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="FILTER CONTACTS..." style={{ marginBottom: "6px" }} />
                        <div style={{ flex: 1, overflowY: "auto", maxHeight: "220px", borderTop: "1px solid var(--line)" }} className="hide-scrollbar">
                            {filteredFriends.length === 0 ? (
                                <div style={{ padding: "12px", fontSize: "10px", color: "var(--text-2)", letterSpacing: "0.08em" }}>NO CONTACTS</div>
                            ) : filteredFriends.map((f) => (
                                <div key={f.id} onClick={() => toggleGroupMember(f.id)} style={{ display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 8px", borderBottom: "1px solid var(--line-soft)", cursor: "pointer", background: groupMembers[f.id] ? "var(--amber-trace)" : "transparent", transition: "background 0.06s" }}
                                    onMouseEnter={e => { if (!groupMembers[f.id]) e.currentTarget.style.background = "var(--bg-4)"; }}
                                    onMouseLeave={e => { if (!groupMembers[f.id]) e.currentTarget.style.background = "transparent"; }}
                                >
                                    <img src={f.avatar} alt={f.name} className="avatar" style={{ width: "22px", height: "22px", border: "1px solid var(--line)" }} />
                                    <span style={{ flex: 1, fontSize: "12px", letterSpacing: "0.02em", color: "var(--text-0)" }}>{f.name}</span>
                                    <div style={{ width: "14px", height: "14px", border: `1px solid ${groupMembers[f.id] ? "var(--amber)" : "var(--line)"}`, background: groupMembers[f.id] ? "var(--amber)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.06s" }}>
                                        {groupMembers[f.id] && <span style={{ color: "var(--text-inv)", fontSize: "9px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <ModalActions>
                            <button onClick={() => setIsGroupModalOpen(false)} className="btn" style={{ height: "28px" }}>CANCEL</button>
                            <button onClick={handleSaveGroup} className="btn btn-primary" style={{ height: "28px" }}>{editingGroupId ? "SAVE" : "CREATE"}</button>
                        </ModalActions>
                    </ModalPanel>
                </ModalOverlay>
            )}

            {/* ── Group Info Modal ── */}
            {isGroupInfoOpen && (
                <ModalOverlay onClose={() => setIsGroupInfoOpen(false)}>
                    <ModalPanel title="GROUP MEMBERS" onClose={() => setIsGroupInfoOpen(false)} style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
                            <ModalInput value={groupInfoAddQuery} onChange={(e) => setGroupInfoAddQuery(e.target.value)} placeholder="ADD BY ID OR NAME..." onKeyPress={(e) => e.key === "Enter" && handleAddMemberToCurrentGroup()} />
                            <button onClick={handleAddMemberToCurrentGroup} className="btn btn-primary" style={{ height: "30px", padding: "0 10px", flexShrink: 0, fontSize: "10px" }}>ADD</button>
                        </div>

                        {groupJoinRequests.length > 0 && (
                            <div style={{ marginBottom: "8px" }}>
                                <SectionLabel>PENDING REQUESTS [{groupJoinRequests.length}]</SectionLabel>
                                {groupJoinRequests.map((req) => (
                                    <div key={req.id} style={{ display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 6px", borderBottom: "1px solid var(--line-soft)", background: "rgba(232,160,0,0.04)" }}>
                                        <img src={req.userAvatar} alt={req.userName} className="avatar" style={{ width: "22px", height: "22px", border: "1px solid var(--amber-dim)" }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.userName}</div>
                                            <div style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.06em" }}>#{req.userNumericId}</div>
                                        </div>
                                        <button onClick={() => handleApproveRequest(req.id, req.fromUid, selectedFriend.id)} style={{ background: "none", border: "1px solid var(--green)", color: "var(--green-lit)", fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.08em", cursor: "pointer", padding: "2px 6px" }}>OK</button>
                                        <button onClick={() => handleRejectRequest(req.id, selectedFriend.id)} style={{ background: "none", border: "1px solid var(--red)", color: "var(--red-lit)", fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.08em", cursor: "pointer", padding: "2px 6px" }}>NO</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <SectionLabel>MEMBERS [{groupInfoUsers.length}]</SectionLabel>
                        <div style={{ flex: 1, overflowY: "auto" }} className="hide-scrollbar">
                            {groupInfoLoading ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}><div className="spinner" /></div>
                            ) : groupInfoUsers.map((m) => (
                                <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 6px", borderBottom: "1px solid var(--line-soft)" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-4)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                >
                                    <div style={{ position: "relative", flexShrink: 0 }}>
                                        <img src={m.avatar} alt={m.name} className="avatar" style={{ width: "22px", height: "22px", border: "1px solid var(--line)", filter: m.online ? "none" : "grayscale(70%)" }} />
                                        <div className={`status-dot ${m.online ? "status-online" : "status-offline"}`} style={{ position: "absolute", bottom: "-2px", right: "-2px" }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-0)", display: "flex", alignItems: "center", gap: "5px" }}>
                                            {m.name}
                                            {user.uid === m.uid && <span className="chip chip-amber">YOU</span>}
                                        </div>
                                        <div style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.06em" }}>
                                            #{m.numericId}{m.online ? " · ONLINE" : m.lastSeen ? ` · ${Math.floor((Date.now() - m.lastSeen) / 60000)}M AGO` : ""}
                                        </div>
                                    </div>
                                    {selectedFriend && groups.find((g) => g.id === selectedFriend.id)?.owner === user.uid && m.uid !== groups.find((g) => g.id === selectedFriend.id)?.owner && (
                                        <button onClick={() => handleRemoveMember(m.uid, selectedFriend.id)} style={{ background: "none", border: "1px solid var(--red)", color: "var(--red-lit)", fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.06em", cursor: "pointer", padding: "2px 5px", transition: "background 0.06s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--red)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                            KICK
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ModalPanel>
                </ModalOverlay>
            )}

            {/* ── Join Group Modal ── */}
            {isJoinGroupModalOpen && (
                <ModalOverlay onClose={() => setIsJoinGroupModalOpen(false)}>
                    <ModalPanel title="JOIN GROUP" onClose={() => setIsJoinGroupModalOpen(false)}>
                        <SectionLabel>ENTER 10-DIGIT GROUP ID</SectionLabel>
                        <ModalInput value={joinGroupId} onChange={(e) => setJoinGroupId(e.target.value)} placeholder="GROUP PUBLIC ID..." onKeyPress={(e) => e.key === "Enter" && handleJoinGroup()} autoFocus />
                        <ModalActions>
                            <button onClick={() => { setIsJoinGroupModalOpen(false); setJoinGroupId(""); }} className="btn" style={{ height: "28px" }}>CANCEL</button>
                            <button onClick={handleJoinGroup} className="btn btn-primary" style={{ height: "28px" }}>REQUEST</button>
                        </ModalActions>
                    </ModalPanel>
                </ModalOverlay>
            )}
        </div>
    );
};

export default Home;
