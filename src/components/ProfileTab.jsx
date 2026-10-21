import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div className="profile-tab">
      <header>{userProfile.name}</header>
      <div className="avatar">
        {userProfile.avatar}
      </div>
      <p>{userProfile.bio}</p>
      <div className="tags">{userProfile.tags.join(', ')}</div>
      <div className="recent-records">{userProfile.recentRecords.join(', ')}</div>
      <div className="city-engagement-summary">{userProfile.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;