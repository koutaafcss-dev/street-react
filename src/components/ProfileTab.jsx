import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="profile-header">
        <h1>{user.name}</h1>
        <div className="avatar">
          {user.avatar ? <img src={user.avatar} alt="Avatar" /> : <span>🚶</span>}
        </div>
      </div>
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {user.records.map(record => <div key={record.id}>{record.description}</div>)}
      </div>
      <div className="community-summary">
        <h2>街との関わり方</h2>
        <p>{user.communitySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;