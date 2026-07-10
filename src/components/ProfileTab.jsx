import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <div>{user.bio}</div>
      <div>
        <h2>My Tags</h2>
        <ul>
          {user.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div>
        <h2>Recent Records</h2>
        <ul>
          {user.records.map(record => <li key={record.id}>{record.summary}</li>)}
        </ul>
      </div>
      <div>
        <h2>How I Connect with the City</h2>
        <p>{user.cityConnectionSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;