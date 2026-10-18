import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div className="profile-tab">
      <header className="profile-header">
        <div className="profile-avatar">
          <img src={userProfile.avatar} alt={`${userProfile.name}'s avatar`} />
        </div>
        <h2>{userProfile.name}</h2>
      </header>
      <div className="profile-bio">
        <p>{userProfile.bio}</p>
      </div>
      <div className="profile-tags">
        <h3>マイタグ</h3>
        <ul>
          {userProfile.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div className="profile-recent-records">
        <h3>最近の記録</h3>
        {/* Assuming userProfile.recentRecords is an array */}
        <ul>
          {userProfile.recentRecords.map(record => <li key={record.id}>{record.content}</li>)}
        </ul>
      </div>
      <div className="profile-summary">
        <h3>街との関わり方</h3>
        <p>{userProfile.cityEngagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;