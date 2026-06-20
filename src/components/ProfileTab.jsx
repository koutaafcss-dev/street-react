import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録</div>
      <div>街との関わり方サマリー</div>
    </div>
  );
};

export default ProfileTab;