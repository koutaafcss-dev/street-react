import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="profile-header">
        <h1>{user.name}</h1>
        <div className="avatar">{user.avatar}</div>
      </div>
      <p>{user.bio}</p>
      <div className="tags">{user.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {/* Assume recent records are displayed here */}
      </div>
      <div className="community-engagement">
        <h2>街との関わり方</h2>
        <p>{user.engagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;