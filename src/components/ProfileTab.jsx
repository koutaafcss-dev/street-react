import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt={user.name} />
      <p>{user.bio}</p>
      <div>{user.tags}</div>
      <div>{user.recentRecords}</div>
      <div>{user.communitySummary}</div>
    </div>
  );
};

export default ProfileTab;