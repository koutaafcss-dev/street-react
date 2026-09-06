import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <header>{user.name}</header>
      <img src={user.avatar} alt={user.name} />
      <p>{user.bio}</p>
      <div className="my-tags">{user.tags.join(', ')}</div>
      <div className="recent-records">{user.recentRecords.join(', ')}</div>
      <div className="city-summary">{user.citySummary}</div>
    </div>
  );
};

export default ProfileTab;