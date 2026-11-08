import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <header>
        <img src={user.avatar} alt={user.name} />
        <h1>{user.name}</h1>
      </header>
      <p>{user.bio}</p>
      <div className="tags">{user.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        <ul>{user.recentRecords.map(record => <li key={record.id}>{record.content}</li>)}</ul>
      </div>
      <div className="community-engagement">
        <h2>街との関わり方</h2>
        <p>{user.engagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;