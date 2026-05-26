import React from "react";

function ProfileTab({ user }) {
  return (
    <div>
      <header>{user.nickname}</header>
      <img src={user.profileAvatarPhoto} alt={user.nickname} />
      <p>{user.bio}</p>
      <div>マイタグ: {user.tags.join(', ')}</div>
      <div>最近の記録: {user.records.length}件</div>
      <div>街との関わり方: {user.cityEngagementSummary}</div>
    </div>
  );
}

export default ProfileTab;