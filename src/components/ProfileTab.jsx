import React from 'react';

const ProfileTab = ({ profile }) => {
  return (
    <div className="profile-tab">
      <header>{profile.name}</header>
      <div className="avatar">{profile.avatar}</div>
      <p>{profile.bio}</p>
      <div className="my-tags">{profile.tags.join(', ')}</div>
      <div className="recent-records">最近の記録: {profile.records.join(', ')}</div>
      <div className="city-engagement">{profile.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;