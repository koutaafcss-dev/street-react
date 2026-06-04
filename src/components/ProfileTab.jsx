import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt="User Avatar" />
      <p>{user.bio}</p>
      <div>
        <h2>My Tags</h2>
        <ul>
          {user.tags.map(tag => (<li key={tag}>{tag}</li>))}
        </ul>
      </div>
      <div>
        <h2>Recent Records</h2>
        <ul>
          {user.records.map(record => (<li key={record.id}>{record.title}</li>))}
        </ul>
      </div>
      <div>
        <h2>Connection Summary</h2>
        <p>{user.connectionSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;