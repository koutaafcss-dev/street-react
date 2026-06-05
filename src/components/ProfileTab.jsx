import React from 'react';

function ProfileTab({ profile }) {
  return (
    <div>
      <header>{profile.nickname}</header>
      <img src={profile.avatar} alt={`${profile.nickname}'s avatar`} />
      <p>{profile.bio}</p>
      <div>{profile.tags.join(', ')}</div>
      <div>最近の記録: {profile.records.join(', ')}</div>
      <div>街との関わり方: {profile.cityEngagement}</div>
    </div>
  );
}

export default ProfileTab;