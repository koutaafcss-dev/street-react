import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録: {user.recentRecords}</div>
      <div>街との関わり方: {user.cityEngagement}</div>
    </div>
  );
};

export default ProfileTab;