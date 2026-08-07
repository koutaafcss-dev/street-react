import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>Recent Records: {user.records.join(', ')}</div>
      <div>Summary of how user engages with the city: {user.cityEngagement}</div>
    </div>
  );
};

export default ProfileTab;