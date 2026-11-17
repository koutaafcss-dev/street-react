import React from 'react';

function ProfileTab({ profile }) {
  return (
    <div>
      <header>{profile.name}</header>
      <img src={profile.avatar} alt={profile.name} />
      <p>{profile.bio}</p>
      <div>{profile.tags.join(', ')}</div>
      <div>{profile.recentRecords.join(', ')}</div>
      <div>{profile.citySummary}</div>
    </div>
  );
}

export default ProfileTab;