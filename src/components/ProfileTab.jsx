import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="header">{user.name}</div>
      <img src={user.avatar} alt={user.name} />
      <div className="bio">{user.bio}</div>
      <div className="tags">{user.tags.join(', ')}</div>
      <div className="recent-records">{user.recentRecords.join(', ')}</div>
      <div className="community-relationship-summary">{user.communitySummary}</div>
    </div>
  );
};

export default ProfileTab;