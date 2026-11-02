import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt="Avatar" />
      <div>{user.bio}</div>
      <div>Tags: {user.tags.join(', ')}</div>
      <h3>Recently Recorded</h3>
      <ul>
        {user.records.map(record => (
          <li key={record.id}>{record.summary}</li>
        ))}
      </ul>
      <div>{user.communityEngagement}</div>
    </div>
  );
};

export default ProfileTab;