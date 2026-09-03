import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <header>{userProfile.name}</header>
      <img src={userProfile.avatar} alt={userProfile.name} />
      <p>{userProfile.bio}</p>
      <div>マイタグ: {userProfile.tags.join(', ')}</div>
      <div>最近の記録: {userProfile.records.join(', ')}</div>
      <div>街との関わり方: {userProfile.engagementSummary}</div>
    </div>
  );
};

export default ProfileTab;