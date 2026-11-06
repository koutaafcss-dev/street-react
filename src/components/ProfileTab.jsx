import React from 'react';

function ProfileTab({ user, onEditAvatar }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <div onClick={onEditAvatar}>
        {user.avatar ? <img src={user.avatar} alt="Avatar" /> : <span>🚶</span>}
      </div>
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
          {user.records.map(record => <li key={record.id}>{record.title}</li>)}
        </ul>
      </div>
      <div>
        <h2>City Interaction Summary</h2>
        <p>{user.cityInteractionSummary}</p>
      </div>
    </div>
  );
}

export default ProfileTab;