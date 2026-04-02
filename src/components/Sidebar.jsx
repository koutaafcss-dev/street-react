import { useMemo } from "react";

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

function getPrimaryLatLng(post) {
  if (typeof post?.lat === "number" && typeof post?.lng === "number") {
    return [post.lat, post.lng];
  }
  if (Array.isArray(post?.locations) && post.locations.length > 0) {
    const first = post.locations[0];
    if (typeof first?.lat === "number" && typeof first?.lng === "number") {
      return [first.lat, first.lng];
    }
  }
  return [null, null];
}

function AvatarView({ profileAvatarEmoji, profileAvatarPhoto, nickname, onEditAvatar, T }) {
  return (
    <button
      onClick={onEditAvatar}
      style={{
        width: 72,
        height: 72,
        borderRadius: 24,
        border: `1px solid ${T.cardBorder}`,
        background: T.card,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
      title="写真・アイコンを変更"
    >
      {profileAvatarPhoto ? (
        <img
          src={profileAvatarPhoto}
          alt={nickname || "avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: 34, lineHeight: 1 }}>{profileAvatarEmoji || "🚶"}</span>
      )}
    </button>
  );
}

function GroupTab({ T, isDark, onOpenGroupPanel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background: isDark ? "rgba(99,102,241,0.08)" : "rgba(238,242,255,0.85)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: T.text, marginBottom: 6 }}>👥 グループ</div>
        <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.7, marginBottom: 10 }}>
          近所、自治体、町内会、友だち同士で小さな掲示板を作れます。
        </div>
        <button
          onClick={onOpenGroupPanel}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          グループを開く
        </button>
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 13 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>できること</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, color: T.sub, fontSize: 12, lineHeight: 1.6 }}>
          <div>・グループ作成</div>
          <div>・招待コードで参加</div>
          <div>・メンバーだけの投稿</div>
          <div>・複数地点を持つ投稿データの保存準備</div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({
  T,
  nickname,
  myPostsCount,
  profileBio,
  profileMyTags,
  onEditNick,
  currentUser,
  profileAvatarEmoji,
  profileAvatarPhoto,
  onEditAvatar,
  trajectoryHistory,
  trajectoryCount,
  showTrajectoryOnMap,
  onToggleTrajectoryMap,
  onShowTrajectoryHistory,
  onOpenLocationSettings,
  gpsPermissionStatus,
}) {
  const lastTrajectory = trajectoryHistory?.length
    ? new Date(trajectoryHistory[trajectoryHistory.length - 1].timestamp).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "まだありません";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <AvatarView
            profileAvatarEmoji={profileAvatarEmoji}
            profileAvatarPhoto={profileAvatarPhoto}
            nickname={nickname}
            onEditAvatar={onEditAvatar}
            T={T}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{nickname || "名無し"}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              {currentUser ? "匿名ログイン中" : "ログイン中"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={onEditNick} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: T.sub, fontSize: 11, cursor: "pointer" }}>名前</button>
              <button onClick={onEditAvatar} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: T.sub, fontSize: 11, cursor: "pointer" }}>写真・アイコン</button>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: profileBio ? T.sub : T.muted, lineHeight: 1.7, marginBottom: 10 }}>
          {profileBio || "この街とどう関わっているか、一言で…"}
        </div>
        {(profileMyTags || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {profileMyTags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>#{tag}</span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 16, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{myPostsCount || 0}</div>
            <div style={{ fontSize: 10, color: T.muted }}>記録</div>
          </div>
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: T.text }}>移動の記録</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>地図には常時出さず、あとで見返せます</div>
          </div>
        </div>
        {/* 位置情報の権限状態バッジ + 設定ボタン */}
        <button
          onClick={onOpenLocationSettings}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, cursor: "pointer", marginBottom: 10, textAlign: "left" }}
        >
          <span style={{ fontSize: 15 }}>📍</span>
          <span style={{ fontSize: 12, color: T.sub, flex: 1 }}>位置情報の設定</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            background: gpsPermissionStatus ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
            color: gpsPermissionStatus ? "#ef4444" : "#10b981",
          }}>
            {gpsPermissionStatus ? "エラーあり" : "正常"}
          </span>
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ padding: "10px 12px", border: `1px solid ${T.cardBorder}`, borderRadius: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{trajectoryCount || 0}</div>
            <div style={{ fontSize: 10, color: T.muted }}>保存地点数</div>
          </div>
          <div style={{ padding: "10px 12px", border: `1px solid ${T.cardBorder}`, borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>{lastTrajectory}</div>
            <div style={{ fontSize: 10, color: T.muted }}>最新の保存</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onShowTrajectoryHistory} style={{ flex: 1, padding: "9px 12px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>履歴を見る</button>
          <button onClick={onToggleTrajectoryMap} style={{ padding: "9px 12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{showTrajectoryOnMap ? "地図表示ON" : "地図表示OFF"}</button>
        </div>
      </div>
    </div>
  );
}

function FeedTab({ posts, userPosition, searchText, setSearchText, sortMode, setSortMode, onFlyTo, onBookmark, bookmarks, onHelped, onGoodJob, T, isDark }) {
  const filtered = useMemo(() => {
    let list = [...(posts || [])].filter(
      (p) => !searchText.trim() || (p.text || "").toLowerCase().includes(searchText.toLowerCase())
    );
    if (sortMode === "near" && userPosition) {
      list.sort((a, b) => {
        const [alat, alng] = getPrimaryLatLng(a);
        const [blat, blng] = getPrimaryLatLng(b);
        const da = alat == null ? Infinity : getDistance(userPosition[0], userPosition[1], alat, alng);
        const db = blat == null ? Infinity : getDistance(userPosition[0], userPosition[1], blat, blng);
        return da - db;
      });
    } else if (sortMode === "new") {
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (sortMode === "helped") {
      list.sort((a, b) => (b.helpedBy || []).length - (a.helpedBy || []).length);
    }
    return list.slice(0, 40);
  }, [posts, userPosition, searchText, sortMode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="検索"
        style={{ width: "100%", padding: "11px 13px", background: T.input, border: `1px solid ${T.border}`, borderRadius: 12, color: T.inputText, fontSize: 13, outline: "none", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        {[{ id: "near", label: "近い" }, { id: "new", label: "新着" }, { id: "helped", label: "助かった" }].map((s) => (
          <button key={s.id} onClick={() => setSortMode(s.id)} style={{ flex: 1, padding: "7px 0", background: sortMode === s.id ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent", border: `1px solid ${sortMode === s.id ? T.sub : T.border}`, borderRadius: 10, color: sortMode === s.id ? T.text : T.muted, fontSize: 11, cursor: "pointer" }}>{s.label}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 12 }}>この範囲にはまだ記録がありません</div>
        </div>
      ) : filtered.map((p) => {
        const bookmarked = (bookmarks || []).includes(p.id);
        const [plat, plng] = getPrimaryLatLng(p);
        const dist = userPosition && plat != null ? getDistance(userPosition[0], userPosition[1], plat, plng) : null;
        const distLabel = dist == null ? "" : dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
        const locationCount = Array.isArray(p.locations) && p.locations.length > 0 ? p.locations.length : 1;
        return (
          <div key={p.id} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: T.muted }}>
                {timeAgo(p.timestamp)}{distLabel ? ` · ${distLabel}` : ""}{locationCount > 1 ? ` · ${locationCount}地点` : ""}
              </div>
              <button onClick={() => onBookmark?.(p.id)} style={{ background: "transparent", border: "none", color: bookmarked ? "#fbbf24" : T.muted, cursor: "pointer", fontSize: 15 }}>{bookmarked ? "🔖" : "☆"}</button>
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, marginBottom: 8 }}>
              {(p.text || "").slice(0, 90)}{(p.text || "").length > 90 ? "…" : ""}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => onFlyTo?.(p)} style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: T.sub, fontSize: 11, cursor: "pointer" }}>地図で見る</button>
              <button onClick={() => onHelped?.(p.id)} style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: "#f59e0b", fontSize: 11, cursor: "pointer" }}>🙏 {(p.helpedBy || []).length}</button>
              <button onClick={() => onGoodJob?.(p.id)} style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 999, color: T.sub, fontSize: 11, cursor: "pointer" }}>✨ {p.likes || 0}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Sidebar(props) {
  const {
    activeTab, setActiveTab,
    posts, userPosition,
    searchText, setSearchText,
    sortMode, setSortMode,
    onFlyTo, onBookmark, bookmarks, onHelped, onGoodJob,
    isDark, T, isMobile,
    nickname, myPostsCount,
    profileBio, profileMyTags,
    onEditNick,
    currentUser,
    onOpenGroupPanel,
    onOpenLocationSettings,
    gpsPermissionStatus,
    profileAvatarEmoji,
    profileAvatarPhoto,
    onEditAvatar,
    trajectoryHistory,
    trajectoryCount,
    showTrajectoryOnMap,
    onToggleTrajectoryMap,
    onShowTrajectoryHistory,
  } = props;

  const tabs = [
    { id: "feed", label: "フィード" },
    { id: "group", label: "グループ" },
    { id: "profile", label: "プロフ" },
  ];

  return (
    <div style={{ width: isMobile ? "100%" : 320, flexShrink: 0, height: isMobile ? "auto" : "100vh", background: T.bg, borderRight: isMobile ? "none" : `1px solid ${T.border}`, padding: "14px 12px 18px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.text, lineHeight: 1 }}>VIALE</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>1km圏内の記録</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "8px 0", background: activeTab === tab.id ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent", border: `1px solid ${activeTab === tab.id ? T.sub : T.border}`, borderRadius: 999, color: activeTab === tab.id ? T.text : T.muted, fontSize: 11, fontWeight: activeTab === tab.id ? 800 : 500, cursor: "pointer" }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "feed" && <FeedTab posts={posts} userPosition={userPosition} searchText={searchText} setSearchText={setSearchText} sortMode={sortMode} setSortMode={setSortMode} onFlyTo={onFlyTo} onBookmark={onBookmark} bookmarks={bookmarks} onHelped={onHelped} onGoodJob={onGoodJob} T={T} isDark={isDark} />}
      {activeTab === "group" && <GroupTab T={T} isDark={isDark} onOpenGroupPanel={onOpenGroupPanel} />}
      {activeTab === "profile" && <ProfileTab T={T} nickname={nickname} myPostsCount={myPostsCount} profileBio={profileBio} profileMyTags={profileMyTags} onEditNick={onEditNick} currentUser={currentUser} profileAvatarEmoji={profileAvatarEmoji} profileAvatarPhoto={profileAvatarPhoto} onEditAvatar={onEditAvatar} trajectoryHistory={trajectoryHistory} trajectoryCount={trajectoryCount} showTrajectoryOnMap={showTrajectoryOnMap} onToggleTrajectoryMap={onToggleTrajectoryMap} onShowTrajectoryHistory={onShowTrajectoryHistory} onOpenLocationSettings={onOpenLocationSettings} gpsPermissionStatus={gpsPermissionStatus} />}
    </div>
  );
}
