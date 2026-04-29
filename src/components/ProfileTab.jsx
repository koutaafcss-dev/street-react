import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="profile-header">
        <h1>{user.name}</h1>
        <img src={user.avatar} alt="Avatar" />
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        <p>My Tags: {user.tags.join(', ')}</p>
      </div>
      <div className="recent-records">
        <h2>Recent Records</h2>
        <ul>
          {user.records.map(record => (
            <li key={record.id}>{record.content}</li>
          ))}
        </ul>
      </div>
      <div className="relationship-summary">
        <h2>How I Relate to the City</h2>
        <p>{user.cityRelation}</p>
      </div>
    </div>
  );
};

export default ProfileTab;