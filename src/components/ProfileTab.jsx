import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <header>
        <h1>{user.name}</h1>
      </header>
      <img src={user.avatar} alt="Avatar" />
      <p>{user.bio}</p>
      <div>
        <h2>My Tags</h2>
        <ul>
          {user.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div>
        <h2>Recent Records</h2>
        <ul>
          {user.records.map(record => <li key={record.id}>{record.content}</li>)}
        </ul>
      </div>
      <div>
        <h2>How I Interact with the City</h2>
        <p>{user.cityInteractionSummary}</p>
      </div>
    </div>
  );
}

export default ProfileTab;