import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="header">
        <h2>{user.name}</h2>
        <img src={user.avatar} alt="Avatar" />
      </div>
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>
      <div className="recent-records">
        <h3>最近の記録</h3>
        {user.recentRecords.map(record => <div key={record.id}>{record.summary}</div>)}
      </div>
      <div className="community-summary">
        <h3>街との関わり方</h3>
        <p>{user.communityEngagement}</p>
      </div>
    </div>
  );
};

export default ProfileTab;