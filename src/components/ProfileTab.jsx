import React from 'react';

const ProfileTab = ({ profile }) => {
  return (
    <div className="profile-tab">
      <header>
        <h1>{profile.nickname}</h1>
        <div className="avatar">{profile.avatar}</div>
      </header>
      <div className="bio">{profile.bio}</div>
      <div className="tags">{profile.tags.join(', ')}</div>
      <div className="recent-records">{profile.recentRecords.join(', ')}</div>
      <div className="summary">{profile.summary}</div>
    </div>
  );
};

export default ProfileTab;