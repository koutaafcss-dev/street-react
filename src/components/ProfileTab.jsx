import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <div className="header">
        <h2>{user.name}</h2>
        <div className="avatar">
          <img src={user.avatar} alt={`${user.name}'s avatar`} />
        </div>
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        <h3>マイタグ</h3>
        <p>{user.tags.join(', ')}</p>
      </div>
      <div className="recent-records">
        <h3>最近の記録</h3>
        <ul>
          {user.records.map(record => (
            <li key={record.id}>{record.content}</li>
          ))}
        </ul>
      </div>
      <div className="connection-summary">
        <h3>街との関わり方</h3>
        <p>{user.connectionSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;