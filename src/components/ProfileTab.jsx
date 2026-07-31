import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>
        <h1>{user.name}</h1>
        <img src={user.avatar} alt={`${user.name}'s avatar`} />
      </header>
      <p>{user.bio}</p>
      <div>
        <h3>My Tags</h3>
        <ul>
          {user.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div>
        <h3>Recent Records</h3>
        <ul>
          {user.records.map(record => <li key={record.id}>{record.content}</li>)}
        </ul>
      </div>
      <div>
        <h3>City Engagement Summary</h3>
        <p>{user.cityEngagement}</p>
      </div>
    </div>
  );
};

export default ProfileTab;