import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <header>{userProfile.name}</header>
      <img src={userProfile.avatar} alt="Avatar" />
      <div>{userProfile.bio}</div>
      <div>{userProfile.tags.join(', ')}</div>
      <div>Recent Records: {userProfile.recentRecords.join(', ')}</div>
      <div>{userProfile.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;