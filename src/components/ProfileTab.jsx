import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <div className="header">
        <h1>{user.name}</h1>
      </div>
      <div className="avatar">
        <img src={user.avatar} alt={user.name} />
      </div>
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
      <div className="records">
        <h2>最近の記録</h2>
        {user.records.map(record => <div key={record.id}>{record.content}</div>)}
      </div>
      <div className="summary">
        <h2>街との関わり方</h2>
        <p>{user.cityEngagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;