import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt="avatar" />
      <div>{user.bio}</div>
      <div>My Tags: {user.tags.join(', ')}</div>
      <div>Recent Records: {user.records.join(', ')}</div>
      <div>Community Engagement Summary: {user.engagement}</div>
    </div>
  );
};

export default ProfileTab;