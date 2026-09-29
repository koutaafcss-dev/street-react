import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div>
      <div>{user.recentRecords.join(', ')}</div>
      <div>{user.citySummary}</div>
    </div>
  );
};

export default ProfileTab;