import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <div className="header">
        <div className="avatar">{user.avatar}</div>
        <h2>{user.name}</h2>
      </div>
      <p>{user.bio}</p>
      <div className="my-tags">
        <h3>My Tags</h3>
        <ul>
          {user.tags.map(tag => (<li key={tag}>{tag}</li>))}
        </ul>
      </div>
      <div className="recent-records">
        <h3>Recent Records</h3>
        <ul>
          {user.records.map(record => (<li key={record.id}>{record.title}</li>))}
        </ul>
      </div>
      <div className="city-summary">
        <h3>How I Interact with the City</h3>
        <p>{user.cityInteraction}</p>
      </div>
    </div>
  );
}

export default ProfileTab;