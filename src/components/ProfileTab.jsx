import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <div className="header">{user.name}</div>
      <div className="avatar">{user.avatar}</div>
      <div className="bio">{user.bio}</div>
      <div className="tags">{user.tags.join(', ')}</div>
      <div className="recent-records">{user.recentRecords.join(', ')}</div>
      <div className="community-summary">{user.communitySummary}</div>
    </div>
  );
}

export default ProfileTab;