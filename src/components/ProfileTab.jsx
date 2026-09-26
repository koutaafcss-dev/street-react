import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div>
      <div>{user.recentRecords}</div>
      <div>{user.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;