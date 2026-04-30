import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="profile-header">
        <img src={user.avatar} alt="avatar" />
        <h1>{user.name}</h1>
      </div>
      <p>{user.bio}</p>
      <div className="my-tags">
        <h2>My Tags</h2>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div className="recent-records">
        <h2>Recent Records</h2>
        <ul>{user.records.map(record => <li key={record.id}>{record.text}</li>)}</ul>
      </div>
      <div className="summary">
        <h2>Street Interaction Summary</h2>
        <p>{user.summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;