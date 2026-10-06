import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <h1>{user.nickname}</h1>
      <img src={user.avatar} alt="Profile Avatar" />
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {user.recentRecords.map(record => <div key={record.id}>{record.text}</div>)}
      </div>
      <div className="summary">
        <h2>街との関わり方サマリー</h2>
        <p>{user.summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;