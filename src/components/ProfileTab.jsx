import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt="Profile Avatar" />
      <p>{user.bio}</p>
      <div>
        <h3>マイタグ</h3>
        <p>{user.tags.join(', ')}</p>
      </div>
      <div>
        <h3>最近の記録</h3>
        <p>{user.records.join(', ')}</p>
      </div>
      <div>
        <h3>街との関わり方サマリー</h3>
        <p>{user.cityEngagement}</p>
      </div>
    </div>
  );
}

export default ProfileTab;