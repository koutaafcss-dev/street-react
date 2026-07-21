import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="header">{user.name}</div>
      <div className="avatar"><img src={user.avatar} alt={user.name} /></div>
      <div className="bio">{user.bio}</div>
      <div className="tags">{user.tags.join(', ')}</div>
      <div className="recent-records">
        <h3>最近の記録</h3>
        {user.records.map(record => (
          <div key={record.id}>{record.content}</div>
        ))}
      </div>
      <div className="summary">{user.summary}</div>
    </div>
  );
};

export default ProfileTab;