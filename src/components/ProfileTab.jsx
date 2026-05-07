import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録: {user.recentRecords.join(', ')}</div>
      <div>街との関わり方: {user.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;
