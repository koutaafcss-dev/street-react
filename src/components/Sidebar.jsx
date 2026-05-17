import { useMemo } from "react";
import TrustScoreDisplay from "./TrustScoreDisplay";
import { getEventStatus, formatEventTime } from "../utils/eventHelpers";

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

const Sidebar = ({ userProfile }) => {
  return (
    <div>
      <AvatarView
        profileAvatarPhoto={userProfile.avatar}
        profileAvatarEmoji={userProfile.emoji}
        nickname={userProfile.nickname}
        onEditAvatar={() => { /* handle avatar edit */ }}
      />
      <div>
        <h2>{userProfile.name}</h2>
        <p>{userProfile.bio}</p>
        <div>
          {/* Removed calendar, TODAY, mood status, always online display */}
          {/* Profile sections: header, avatar, name, bio, my tags, recent records, and summary of connections with the city */}
          <h3>マイタグ</h3>
          <ul>
            {userProfile.tags.map(tag => <li key={tag}>{tag}</li>)}
          </ul>
          <h3>最近の記録</h3>
          <ul>
            {userProfile.records.map(record => <li key={record.id}>{record.title}</li>)}
          </ul>
          <h3>街との関わり方</h3>
          <p>{userProfile.cityConnectionSummary}</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;