import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt="User Avatar" />
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <h3>Recent Records</h3>
      <div>{user.records.map(record => <div key={record.id}>{record.title}</div>)}</div>
      <h3>Summary of Engagement with the City</h3>
      <div>{user.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;