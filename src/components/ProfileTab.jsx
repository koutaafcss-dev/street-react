import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt="Profile Avatar" />
      <p>{user.bio}</p>
      <div>
        <h2>My Tags</h2>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div>
        <h2>Recent Records</h2>
        <ul>{user.records.map(record => <li key={record}>{record}</li>)}</ul>
      </div>
      <div>
        <h2>Summary of Connection to City</h2>
        <p>{user.cityConnectionSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;