import { useMemo } from "react";
import TrustScoreDisplay from "./TrustScoreDisplay";

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

// Other Sidebar components or functions omitted for brevity but ensure calendar and TODAY functionality is removed.

export default Sidebar;