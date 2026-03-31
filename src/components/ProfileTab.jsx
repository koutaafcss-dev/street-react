import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <header>
        <h1>{user.name}</h1>
        <img src={user.avatar} alt="avatar" />
      </header>
      <p>{user.bio}</p>
      <div className="tags">
        <h2>マイタグ</h2>
        <ul>
          {user.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        <ul>
          {user.records.map(record => <li key={record.id}>{record.summary}</li>)}
        </ul>
      </div>
      <div className="community-summary">
        <h2>街との関わり方サマリー</h2>
        <p>{user.communitySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;