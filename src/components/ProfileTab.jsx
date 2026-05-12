import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>
        <h1>{user.name}</h1>
        <div>{user.avatar}</div>
      </header>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div>
      <div>最近の記録: {user.records}</div>
      <div>街との関わり方: {user.summary}</div>
    </div>
  );
};

export default ProfileTab;