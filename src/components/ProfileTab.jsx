import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt="Avatar" />
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>Recent Activities</div>
      <div>{user.records}</div>
      <div>{user.summary}</div>
    </div>
  );
};

export default ProfileTab;