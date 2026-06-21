import React from 'react';

function ProfileTab({ user }) {
  return (
    <div className="profile-tab">
      <div className="header">
        <h1>{user.name}</h1>
      </div>
      <div className="avatar">
        <img src={user.avatar} alt={`${user.name}'s avatar`} />
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        <h2>My Tags</h2>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div className="recent-records">
        <h2>Recent Records</h2>
        <ul>{user.recentRecords.map(record => <li key={record.id}>{record.description}</li>)}</ul>
      </div>
      <div className="community-connection">
        <h2>How I Connect with the Community</h2>
        <p>{user.communitySummary}</p>
      </div>
    </div>
  );
}

export default ProfileTab;