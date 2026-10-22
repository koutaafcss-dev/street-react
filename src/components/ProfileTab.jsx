import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt={user.name} />
      <p>{user.bio}</p>
      <div>
        <h2>マイタグ</h2>
        {user.tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
      <div>
        <h2>最近の記録</h2>
        {user.recentRecords.map(record => <div key={record.id}>{record.content}</div>)}
      </div>
      <div>
        <h2>街との関わり方サマリー</h2>
        <p>{user.cityEngagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;