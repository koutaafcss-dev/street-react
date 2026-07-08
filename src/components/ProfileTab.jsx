import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="header">
        <h2>{user.name}</h2>
      </div>
      <div className="avatar">
        <img src={user.avatar} alt={user.name} />
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="my-tags">
        <h3>My Tags</h3>
        <ul>
          {user.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div className="recent-records">
        <h3>Recent Records</h3>
        <ul>
          {user.recentRecords.map(record => <li key={record.id}>{record.title}</li>)}
        </ul>
      </div>
      <div className="community-summary">
        <h3>How I Relate to the Community</h3>
        <p>{user.communitySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;