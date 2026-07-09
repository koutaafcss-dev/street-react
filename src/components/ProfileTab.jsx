import React from "react";

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt="Profile Avatar" />
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録: {user.recentRecords.join(', ')}</div>
      <div>街との関わり方サマリー: {user.cityEngagement}</div>
    </div>
  );
};

export default ProfileTab;