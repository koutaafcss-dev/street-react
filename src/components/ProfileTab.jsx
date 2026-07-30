import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録</div>
      <div>{user.recentRecords}</div>
      <div>街との関わり方サマリー</div>
      <div>{user.cityInvolvement}</div>
    </div>
  );
};

export default ProfileTab;