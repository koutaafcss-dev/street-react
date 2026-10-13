import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録: {user.recentRecords.join(', ')}</div>
      <div>街との関わり方: {user.relationshipSummary}</div>
    </div>
  );
};

export default ProfileTab;