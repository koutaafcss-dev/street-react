import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <div>{user.bio}</div>
      <img src={user.avatar} alt={user.name} />
      <div>My Tags: {user.tags.join(', ')}</div>
      <div>Recent Records: {user.records.join(', ')}</div>
      <div>Summary of Engagement with the City: {user.cityEngagement}</div>
    </div>
  );
};

export default ProfileTab;