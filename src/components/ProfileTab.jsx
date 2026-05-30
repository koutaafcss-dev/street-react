import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt='Avatar' />
      <p>{user.bio}</p>
      <div>
        <h3>My Tags</h3>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div>
        <h3>Recent Records</h3>
        <ul>{user.records.map(record => <li key={record.id}>{record.title}</li>)}</ul>
      </div>
      <div>
        <h3>Summary of Interactions with the City</h3>
        <p>{user.cityInteractionSummary}</p>
      </div>
    </div>
  );
}

export default ProfileTab;