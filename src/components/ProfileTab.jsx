import React from 'react';

const ProfileTab = ({ user, onEditAvatar }) => {
  return (
    <div>
      <div className="header">
        <h1>{user.name}</h1>
        <button onClick={onEditAvatar}>Edit Avatar</button>
      </div>
      <div className="avatar">
        <img src={user.avatar} alt={`${user.name}'s avatar`} />
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="my-tags">
        <h2>My Tags</h2>
        <ul>
          {user.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div className="recent-records">
        <h2>Recent Records</h2>
        <ul>
          {user.recentRecords.map(record => <li key={record.id}>{record.content}</li>)}
        </ul>
      </div>
      <div className="community-summary">
        <h2>Community Engagement</h2>
        <p>{user.communitySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;