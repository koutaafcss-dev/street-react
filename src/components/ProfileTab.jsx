import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <h2>最近の記録</h2>
      <ul>
        {user.records.map(record => (
          <li key={record.id}>{record.description}</li>
        ))}
      </ul>
      <div>{user.summary}</div>
    </div>
  );
}

export default ProfileTab;