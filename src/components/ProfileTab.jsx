import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt='Avatar' />
      <p>{user.bio}</p>
      <h2>My Tags</h2>
      <p>{user.tags.join(', ')}</p>
      <h2>Recent Records</h2>
      <ul>
        {user.records.map(record => (
          <li key={record.id}>{record.title}</li>
        ))}
      </ul>
      <h2>Engagement with the City</h2>
      <p>{user.engagementSummary}</p>
    </div>
  );
}

export default ProfileTab;