import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <div className="header">{user.name}</div>
      <div className="avatar">{user.avatar}</div>
      <div className="bio">{user.bio}</div>
      <div className="tags">{user.tags.join(', ')}</div>
      <div className="recent-records">{user.recentRecords.join(', ')}</div>
      <div className="community-connection-summary">{user.communitySummary}</div>
    </div>
  );
};

export default ProfileTab;