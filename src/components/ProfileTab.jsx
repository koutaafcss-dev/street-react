import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <img src={user.avatar} alt={user.name} />
      <p>{user.bio}</p>
      <div>My Tags: {user.tags.join(', ')}</div>
      <div>Recent Records: {user.records.join(', ')}</div>
      <div>City Interaction Summary: {user.citySummary}</div>
    </div>
  );
};

export default ProfileTab;