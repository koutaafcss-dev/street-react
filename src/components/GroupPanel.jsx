import { useMemo, useState } from "react";

function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  const h = Math.floor(m / 60);
  const day = Math.floor(h / 24);
  if (day > 0) return `${day}日前`;
  if (h > 0) return `${h}時間前`;
  if (m > 0) return `${m}分前`;
  return "今";
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function CreateGroupModal({ isDark, T, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setError("グループ名を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate({ name, description: desc });
      onClose();
    } catch (e) {
      setError(e?.message || "作成に失敗しました");
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ background: isDark ? "rgba(6,10,20,0.99)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 22, padding: "26px 28px", width: "min(380px,92vw)" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 4 }}>グループを作成</div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, lineHeight: 1.7 }}>近所、自治体、町内会、友だち同士などで使えます。</div>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder="グループ名" style={{ width: "100%", padding: "11px 13px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, color: T.inputText, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 120))} placeholder="説明（任意）" rows={3} style={{ width: "100%", padding: "11px 13px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, color: T.inputText, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10 }} />
        {error && <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={submit} disabled={loading || !name.trim()} style={{ flex: 1, padding: "11px 0", background: name.trim() ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "transparent", color: name.trim() ? "white" : T.muted, border: `1px solid ${name.trim() ? "transparent" : T.border}`, borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: name.trim() ? "pointer" : "not-allowed" }}>{loading ? "作成中…" : "作成する"}</button>
          <button onClick={onClose} style={{ padding: "11px 16px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 13, cursor: "pointer" }}>×</button>
        </div>
      </div>
    </Modal>
  );
}

function JoinGroupModal({ isDark, T, onClose, onJoin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!code.trim()) {
      setError("招待コードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onJoin(code.trim());
      onClose();
    } catch (e) {
      setError(e?.message || "参加に失敗しました");
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ background: isDark ? "rgba(6,10,20,0.99)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 22, padding: "26px 28px", width: "min(360px,92vw)" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 4 }}>グループに参加</div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 16 }}>招待コードを入力してください。</div>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="ABC123" style={{ width: "100%", padding: "12px 14px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, color: T.inputText, fontSize: 18, fontWeight: 700, letterSpacing: "0.15em", outline: "none", boxSizing: "border-box", textAlign: "center", marginBottom: 10 }} />
        {error && <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={submit} disabled={loading || !code.trim()} style={{ flex: 1, padding: "11px 0", background: code.trim() ? "linear-gradient(135deg,#059669,#10b981)" : "transparent", color: code.trim() ? "white" : T.muted, border: `1px solid ${code.trim() ? "transparent" : T.border}`, borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: code.trim() ? "pointer" : "not-allowed" }}>{loading ? "参加中…" : "参加する"}</button>
          <button onClick={onClose} style={{ padding: "11px 16px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 13, cursor: "pointer" }}>×</button>
        </div>
      </div>
    </Modal>
  );
}

export default function GroupPanel({
  currentUser, isDark, T, isMobile,
  myGroups, groupsLoading,
  activeGroupId, setActiveGroupId,
  activeGroupData, groupPosts, groupPostsLoading,
  isAdmin,
  onCreateGroup, onJoinGroup, onLeaveGroup,
  onAddGroupPost, onDeleteGroupPost,
  onRegenerateInviteCode,
  onUpdateSettings,
  onClose,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [announceRole, setAnnounceRole] = useState("admin");

  const group = activeGroupData;
  const admin = isAdmin(group);
  const memberCount = Object.keys(group?.members || {}).length;
  const safePosts = useMemo(() => (groupPosts || []).filter((p) => !p.hidden && !p.isArchived), [groupPosts]);

  const copyInvite = async () => {
    if (!group?.inviteCode) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const submitPost = async () => {
    if (!activeGroupId || !draft.trim() || posting) return;
    setPosting(true);
    try {
      await onAddGroupPost(activeGroupId, { text: draft.trim() });
      setDraft("");
    } finally {
      setPosting(false);
    }
  };

  const saveSettings = async () => {
    if (!activeGroupId) return;
    await onUpdateSettings(activeGroupId, { announceRole });
  };

  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: isMobile ? "100vw" : 360, height: "100vh", background: isDark ? "rgba(5,8,16,0.99)" : "#f8fafc", borderLeft: `1px solid ${T.border}`, zIndex: 5000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 18px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>グループ</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>招待制の小さな掲示板</div>
        </div>
        <button onClick={onClose} style={{ fontSize: 20, background: "transparent", border: "none", color: T.muted, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {!activeGroupId ? (
        <div style={{ padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCreate(true)} style={{ flex: 1, padding: "12px 0", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>作成する</button>
            <button onClick={() => setShowJoin(true)} style={{ flex: 1, padding: "12px 0", background: "linear-gradient(135deg,#059669,#10b981)", color: "white", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>参加する</button>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>できること</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, color: T.sub, fontSize: 12, lineHeight: 1.6 }}>
              <div>・近所や自治体向けの連絡用グループ作成</div>
              <div>・招待コードで参加</div>
              <div>・メンバーだけが見える投稿</div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>参加中のグループ</div>
          {groupsLoading ? (
            <div style={{ color: T.muted, fontSize: 12 }}>読み込み中…</div>
          ) : myGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: T.muted }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>👥</div>
              <div style={{ fontSize: 12 }}>まだ参加しているグループがありません</div>
            </div>
          ) : myGroups.map((g) => (
            <button key={g.id} onClick={() => setActiveGroupId(g.id)} style={{ textAlign: "left", padding: "13px 14px", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 13, cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>{g.name}</div>
              {g.description && <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{g.description}</div>}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <button onClick={() => setActiveGroupId(null)} style={{ background: "transparent", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>‹</button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.text }}>{group?.name || "グループ"}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>👥 {memberCount}人</div>
              </div>
            </div>
            {group?.description && <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{group.description}</div>}
          </div>

          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>招待コード</div>
              <div style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.border}`, color: T.text, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>{group?.inviteCode || "------"}</div>
              <button onClick={copyInvite} style={{ marginLeft: "auto", padding: "5px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: copied ? "#10b981" : T.muted, fontSize: 11, cursor: "pointer" }}>{copied ? "コピー済み" : "コピー"}</button>
              {admin && <button onClick={async () => { await onRegenerateInviteCode(activeGroupId); }} style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: T.muted, fontSize: 11, cursor: "pointer" }}>再生成</button>}
            </div>

            {admin && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: T.muted }}>お知らせ投稿</div>
                {["admin", "all"].map((v) => (
                  <button key={v} onClick={() => setAnnounceRole(v)} style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${announceRole === v ? "#3b82f6" : T.border}`, color: announceRole === v ? "#3b82f6" : T.muted, background: "transparent", fontSize: 11, cursor: "pointer" }}>{v === "admin" ? "管理者のみ" : "全員"}</button>
                ))}
                <button onClick={saveSettings} style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: T.muted, fontSize: 11, cursor: "pointer" }}>保存</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 240))} placeholder="グループに投稿する…" rows={2} style={{ flex: 1, padding: "10px 12px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, color: T.inputText, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submitPost} disabled={!draft.trim() || posting} style={{ flex: 1, padding: "10px 0", background: draft.trim() ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "transparent", color: draft.trim() ? "white" : T.muted, border: `1px solid ${draft.trim() ? "transparent" : T.border}`, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed" }}>{posting ? "投稿中…" : "投稿"}</button>
              <button onClick={async () => { await onLeaveGroup(activeGroupId); setActiveGroupId(null); }} style={{ padding: "10px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: "#ef4444", cursor: "pointer" }}>退出</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {groupPostsLoading ? (
              <div style={{ color: T.muted, fontSize: 12, textAlign: "center", padding: "40px 0" }}>読み込み中…</div>
            ) : safePosts.length === 0 ? (
              <div style={{ color: T.muted, fontSize: 12, textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>📝</div>
                <div>まだ投稿がありません</div>
              </div>
            ) : safePosts.map((p) => (
              <div key={p.id} style={{ padding: "11px 13px", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 13 }}>
                <p style={{ fontSize: 13, color: T.text, margin: "0 0 7px", lineHeight: 1.65 }}>{p.text}</p>
                <div style={{ display: "flex", gap: 8, fontSize: 10, color: T.muted, alignItems: "center" }}>
                  <span>{p.userId === currentUser ? "あなた" : "メンバー"}</span>
                  <span>{timeAgo(p.timestamp)}</span>
                  {p.userId === currentUser && <button onClick={() => onDeleteGroupPost(activeGroupId, p.id)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: "#ef4444", fontSize: 10, cursor: "pointer" }}>削除</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && <CreateGroupModal isDark={isDark} T={T} onClose={() => setShowCreate(false)} onCreate={onCreateGroup} />}
      {showJoin && <JoinGroupModal isDark={isDark} T={T} onClose={() => setShowJoin(false)} onJoin={onJoinGroup} />}
    </div>
  );
}
