import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <h1>{userProfile.name}</h1>
      <div>{userProfile.bio}</div>
      <div>
        <h2>マイタグ</h2>
        <div>{userProfile.tags.join(', ')}</div>
      </div>
      <div>
        <h2>最近の記録</h2>
        <div>{userProfile.recentRecords.join(', ')}</div>
      </div>
      <div>
        <h2>街との関わり方</h2>
        <div>{userProfile.cityEngagementSummary}</div>
      </div>
    </div>
  );
};

export default ProfileTab;