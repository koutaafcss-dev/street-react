import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <img src={user.avatar} alt="Profile Avatar" />
      <p>{user.bio}</p>
      <div>
        <h3>My Tags</h3>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div>
        <h3>Recent Records</h3>
        <ul>{user.records.map(record => <li key={record.id}>{record.content}</li>)}</ul>
      </div>
      <div>
        <h3>Community Interaction</h3>
        <p>{user.summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;