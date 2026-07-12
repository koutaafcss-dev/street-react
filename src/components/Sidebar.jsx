import { useMemo } from "react";
import TrustScoreDisplay from "./TrustScoreDisplay";
import { getEventStatus, formatEventTime } from "../utils/eventHelpers";

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

export default function Sidebar() {
  return (
    <div>
      <AvatarView
        profileAvatarEmoji="🚶"
        profileAvatarPhoto=""
        nickname="User"
        onEditAvatar={() => {}}
        T={{ cardBorder: '#ccc', card: '#fff' }}
      />
      <TrustScoreDisplay />
    </div>
  );
}