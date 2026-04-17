import React from 'react';

function ProfileTab({ user }) {
  return (
    <div className="profile-tab">
      <h2>{user.name}</h2>
      <div className="avatar">
        <img src={user.avatarUrl} alt={`${user.name}'s avatar`} />
      </div>
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
      </div>
      <div className="recent-records">
        <h3>最近の記録</h3>
        <ul>
          {user.recentRecords.map(record => <li key={record.id}>{record.title}</li>)}
        </ul>
      </div>
      <div className="interaction-summary">
        <h3>街との関わり方</h3>
        <p>{user.interactionSummary}</p>
      </div>
    </div>
  );
}

export default ProfileTab;