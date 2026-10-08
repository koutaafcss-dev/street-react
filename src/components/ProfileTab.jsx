import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt='Avatar' />
      <div>{user.bio}</div>
      <div>My Tags: {user.tags.join(', ')}</div>
      <div>Recent Records: {user.recentRecords.join(', ')}</div>
      <div>Community Summary: {user.communitySummary}</div>
    </div>
  );
};

export default ProfileTab;