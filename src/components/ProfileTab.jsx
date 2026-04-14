import React from 'react';

function ProfileTab({ profile }) {
  return (
    <div>
      <div className="header">{profile.name}</div>
      <div className="avatar">{profile.avatar}</div>
      <div className="bio">{profile.bio}</div>
      <div className="tags">{profile.tags.join(', ')}</div>
      <div className="recent-records">{profile.recentRecords.join(', ')}</div>
      <div className="community-summary">{profile.communitySummary}</div>
    </div>
  );
}

export default ProfileTab;
